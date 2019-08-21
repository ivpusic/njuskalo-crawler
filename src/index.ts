require('dotenv').config();

import * as fs from 'fs';
import * as moment from 'moment';

import njuskalo from './sources/njuskalo';
import plavi from './sources/plavi';
import indeks from "./sources/indeks";
import { sendEmail } from './utils/email';
import { config } from './config';
import { logger } from './utils/logger';
import { IResultMap } from './sources/results';

async function getOldAds(): Promise<IResultMap> {
  if (fs.existsSync(config.adsFile)) {
    const file = fs.readFileSync(config.adsFile);
    return JSON.parse(file.toString());
  }

  return {};
}

function findNewItems(old: IResultMap, current: IResultMap): IResultMap {
  const newItems = {};

  for (const href in current) {
    if (!old[href]) {
      newItems[href] = current[href];
    }
  }

  return newItems;
}

async function sendResultsEmail(results: IResultMap): Promise<void> {
  const ads = Object.values(results);
  if (!ads.length) {
    return;
  }

  const html = `
    <html>
      <body>
        <table>
        ${ads.map((add) => {
    return `<tr>
            <td><img style="max-width: 200px; max-height: 100px" alt="nema slike" src='${add.image}' /></td>
            <td>
              <a href="${add.href}">${add.title}</a><br/>
              ${add.description} <br/>
              Cijena <b>${add.price}</b><br/>
              Objavljen ${moment(add.publishedAt).utcOffset('+0100').format('LLL')}
            </td>
          </tr>`;
  }).join('')}
        </table>
      </body>
    </html>
  `;

  await sendEmail(config.emailReceivers, `novi oglasi za stan ${moment().utcOffset('+0100').format('DD.MM.YYYY')}`, html);
  logger.info('sending email...');
}

async function main(): Promise<void> {
  const oldAds = await getOldAds();
  logger.info('-------------------------------------');

  logger.info('running njuskalo crawler...');
  const njuskaloAdds = await njuskalo(2);
  logger.info('-------------------------------------');

  logger.info('running plavi oglasnik crawler...');
  const plaviAdds = await plavi(2);
  logger.info('-------------------------------------');

  logger.info('running index oglasi crawler...');
  const indeksAds = await indeks(2);
  logger.info('-------------------------------------');

  const allNewItems = { ...njuskaloAdds, ...plaviAdds, ...indeksAds };
  const newItems = findNewItems(oldAds, allNewItems);
  logger.info(`found ${Object.keys(newItems).length} new adds`);

  await sendResultsEmail(newItems);
  fs.writeFileSync(config.adsFile, JSON.stringify({ ...oldAds, ...newItems }, null, 2));
  logger.info('-------------------------------------');
}

main().then(() => {
  logger.info('done');
}).catch((e) => {
  logger.info('error', e);
  return sendEmail(config.errorsReceiver, 'crawler executing issue', `<html><body><span>Something is wrong with input html. ${e.message}</span></body></html>`);
});
