import * as cheerio from 'cheerio';
import axios from 'axios';
import * as moment from 'moment';
import * as SocksProxyAgent from 'socks-proxy-agent'

import { sendEmail } from '../utils/email';
import { trim } from '../utils/string';
import { logger } from '../utils/logger';
import { config } from '../config';
import arrayToObject from '../utils/arrayToObject';
import { IResultMap } from './results';

const urlWithPage = (baseUrl: string, page: number): string => `${baseUrl}&page=${page}`;

const httpsAgent = config.socksProxyServer ? SocksProxyAgent(config.socksProxyServer) : undefined
const client = axios.create({ httpsAgent })

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
          if (moment(publishedAt).isAfter(config.notBeforeDateTime)) {
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

async function processPage(url: string): Promise<IResultMap> {
  logger.info(`processing page ${url}`);
  logger.info('downloading html...');

  const html = await client.get(url);

  logger.info('parsing regular ads...');
  const regularSelector = '.EntityList--Regular > .EntityList-items > .EntityList-item';
  if (!cheerio.load(html.data)('.EntityList--Regular').length) {
    logger.error('something is wrong with njuskalo html');
    await sendEmail(config.errorsReceiver, 'Parsing failed', `<html><body><span>Something is wrong with input html. ${html.data}</span></body></html>`)
    return {};
  }

  const regularResults = await extractAds(cheerio.load(html.data), regularSelector);

  let featuredResults = {};
  const featuredSelector = '.EntityList--VauVau > .EntityList-items > .EntityList-item';
  if (!cheerio.load(html.data)('.EntityList--VauVau').length) {
    logger.info('parsing featured ads...');
    featuredResults = await extractAds(cheerio.load(html.data), featuredSelector);
  }

  return {
    ...featuredResults,
    ...regularResults,
  }
}

export default async (pageCount) => {
  if (!config.njuskaloUrl) {
    logger.info('skipping njuskalo url...');
    return {};
  }

  const urls = [];
  for (let url of config.njuskaloUrl.split(',')) {
    for(let i = 1; i <= pageCount; i++) {
      urls.push(urlWithPage(url, i))
    }
  }

  const results = await Promise.all(urls.map(processPage));

  return arrayToObject(results);
}
