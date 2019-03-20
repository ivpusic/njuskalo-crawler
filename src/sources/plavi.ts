import * as cheerio from 'cheerio';
import axios from 'axios';
import * as moment from 'moment';

import { sendEmail } from '../utils/email';
import { trim } from '../utils/string';
import { logger } from '../utils/logger';
import { config } from '../config';
import { IResultMap } from './results';

const getUrl = (page: number) => `${config.plaviUrl}&page=${page}`;

function parseImage(str: string) {
  if (str && str.startsWith('/')) {
    return `https://www.oglasnik.hr${str}`;
  }

  return str;
}

async function extractAds($: CheerioStatic, selector: string): Promise<IResultMap> {
  const ads = $(selector);
  logger.info('extracting plavi oglasnik ads...');

  return new Promise((resolve, reject) => {
    const results = {};
    const totalSize = ads.length;
    if (!totalSize) {
      return resolve(results);
    }

    ads.each(function (index) {
      try {
        let href = $(this).attr('href');
        const title = $(this).find('.classified-title').text();
        const description = '';
        const image = parseImage($(this).find('.image-wrapper').data('src'));
        const price = $(this).find('.price-kn').text();
        let publishedAt = $(this).find('.ad-box-end > .date').text();
        publishedAt = moment(publishedAt, 'DD.MM.YYYY.').toISOString();

        if (publishedAt) {
          if (moment(publishedAt).isAfter('2018-02-20T00:00:00+01:00')) {
            href = trim(href);
            results[href] = {
              href,
              title: trim(title),
              image: trim(image),
              description: trim(description),
              price: trim(price),
              publishedAt,
            };
          } else {
            logger.info(`skipping add because published at ${publishedAt}`);
          }
        }

        if (index + 1 === totalSize) {
          resolve(results);
        }
      } catch (e) {
        logger.error(e);
        reject(e);
      }
    });
  });
}

async function processPage(page: number) {
  logger.info(`processing page ${page}`);
  logger.info('downloading html...');

  const html = await axios.get(getUrl(page), {
    headers: {
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36'
    }
  });

  logger.info('parsing regular ads...');
  const regularSelector = '.category-fullrow-layout > .ad-box';
  if (!cheerio.load(html.data)('.category-fullrow-layout').length) {
    logger.error('something is wrong with plavi oglasnik html');
    await sendEmail('pusic007@gmail.com', 'Parsing for plavi oglasnik failed', `<html><body><span>Something is wrong with input html. ${html.data}</span></body></html>`)
    return {};
  }

  return extractAds(cheerio.load(html.data), regularSelector);
}

export default async function () {
  const results1 = await processPage(1);
  const results2 = await processPage(2);

  return {
    ...results1,
    ...results2,
  };
}
