import * as cheerio from 'cheerio';
import axios from 'axios';
import * as moment from 'moment';

import { sendEmail } from '../utils/email';
import { trim } from '../utils/string';
import { logger } from '../utils/logger';
import { config } from '../config';
import { IResultMap } from './results';

const getUrl = (page: number) => `${config.njuskaloUrl}&page=${page}`;

async function extractAds($: CheerioStatic, selector: string): Promise<IResultMap> {
  const ads = $(selector);
  logger.info('extracting njuskalo ads...');

  return new Promise((resolve, reject) => {
    const results: IResultMap = {};
    const totalSize = ads.length;
    if (!totalSize) {
      return resolve(results);
    }

    ads.each(function (index) {
      try {
        let href = $(this).find('.entity-title > a').attr('href');
        const title = $(this).find('.entity-title > a').text();
        const description = $(this).find('.entity-description > .entity-description-main').text();
        const image = $(this).find('.entity-thumbnail > a > .entity-thumbnail-img').data('src');
        const price = $(this).find('.price-item > .price--eur').text();
        const publishedAt = $(this).find('.entity-pub-date > .date--full').attr('datetime');

        if (publishedAt) {
          if (moment(publishedAt).isAfter('2018-02-21T21:40:28+01:00')) {
            href = `https://www.njuskalo.hr${trim(href)}`;
            results[href] = {
              href,
              title: trim(title),
              image: `https:${trim(image)}`,
              description: trim(description),
              price: trim(price),
              publishedAt,
            };
          } else {
            logger.info(`skipping add because published at ${publishedAt}`);
          }
        }

        if (index + 1 === totalSize) {
          return resolve(results);
        }
      } catch (e) {
        logger.error(e);
        return reject(e);
      }
    });
  });
}

async function processPage(page: number) {
  logger.info(`processing page ${page}`);
  logger.info('downloading html...');

  const html = await axios.get(getUrl(page), {
    headers: {
      'cookie': 'xtvrn=$413863$; __gfp_64b=LqXXGkT3BGdIDwE_E2l_fL7Iu7C4qZbMj9ZYmZWNqtL.67; __uzma=952b2159-7174-4359-8f3b-ed409a0c3942; __uzmb=1513553216; njuskalo_accept_cookies=true; __ssuzjsr2=a9be0cd8e; __uzmaj2=7bf69937-2bcd-4913-95d7-861d3430e1cb9259; __uzmbj2=1513553307; _ga=GA1.2.884082042.1513553144; _STUU=6f955e4c-417e-4827-8bdb-742c23a85bb8; njupop=cf103f3429f6ffd510434497d368c8f2130a292e42cfdfeeedeaadc0ba6e167a; _gid=GA1.2.1888754035.1519050790; PHPSESSID=m8g27f5vboeil633m357578gn3; __utmc=228389250; __utmz=228389250.1519218318.14.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); DM_SitId220=true; DM_SitId220SecId924=true; comm100_guid2_1000306=94RqMb3yc0qMwAQF0TZ5Bw; __utma=228389250.884082042.1513553144.1519223147.1519241526.16; ccapi.accessToken=0c2662fe3aca9dd5fd077bec7536a149; DM_SitIdT220=true; DM_SitId220SecIdT924=true; __utmt=1; __uzmc=7132650880145; uzdbm_a=f023a4b8-851d-fa9d-252e-87f9978f558c; __uzmd=1519245743; __utmb=228389250.13.10.1519241526; __uzmcj2=1727837999141; __uzmdj2=1519245767; DotMetricsTimeOnPage=%7B%22C%22%3A%222018-02-21T21%3A42%3A21.6310485+01%3A00%22%2C%22E%22%3A%220dac0161-0baf-4f9a-817f-e740ed377cfd%22%2C%22S%22%3A924%2C%22T%22%3A37%7D',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36'
    }
  });

  logger.info('parsing regular ads...');
  const regularSelector = '.EntityList--Regular > .EntityList-items > .EntityList-item';
  if (!cheerio.load(html.data)('.EntityList--Regular').length) {
    logger.error('something is wrong with njuskalo html');
    await sendEmail('pusic007@gmail.com', 'Parsing failed', `<html><body><span>Something is wrong with input html. ${html.data}</span></body></html>`)
    return {};
  }

  const regularResults = await extractAds(cheerio.load(html.data), regularSelector);

  let featuredResults = {};
  if (page === 1) {
    logger.info('parsing featured ads...');
    const featuredSelector = '.EntityList--VauVau > .EntityList-items > .EntityList-item';
    featuredResults = await extractAds(cheerio.load(html.data), featuredSelector);
  }

  return {
    ...featuredResults,
    ...regularResults,
  }
}

export default async function () {
  const results1 = await processPage(1);
  const results2 = await processPage(2);

  return {
    ...results1,
    ...results2
  }
}
