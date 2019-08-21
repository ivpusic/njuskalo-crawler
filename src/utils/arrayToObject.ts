const arrayToObject = (arr: any[]) =>
  arr.reduce((obj, item) => {
    return {
      ...obj,
      ...item,
    }
  }, {});

export default arrayToObject;
