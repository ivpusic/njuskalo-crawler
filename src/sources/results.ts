export interface ISearchResult {
  href: string,
  title: string,
  image: string,
  description: string,
  price: string,
  publishedAt: string,
}

export interface IResultMap {
  [href: string]: ISearchResult
}
