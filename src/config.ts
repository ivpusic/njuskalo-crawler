function getEnvOrFail(ENV: string): string {
  if (!process.env[ENV]) {
    throw new Error(`Please provide ${ENV} env variable`);
  }

  return process.env[ENV];
}

const emailFrom = getEnvOrFail('EMAIL_FROM');
const emailTransport = getEnvOrFail('EMAIL_TRANSPORT');
const emailAuthUsername = getEnvOrFail('EMAIL_AUTH_USERNAME');
const emailAuthPassword = getEnvOrFail('EMAIL_AUTH_PASSWORD');
const emailReceivers = getEnvOrFail('EMAIL_RECEIVERS').split(',');
const errorsReceiver = getEnvOrFail('ERRORS_RECEIVER');
const adsFile = getEnvOrFail('ADS_FILE');
const notBeforeDateTime = getEnvOrFail('NOT_BEFORE_DATE_TIME');

const njuskaloUrl = process.env.NJUSKALO_URL;
const plaviUrl = process.env.PLAVI_URL;

export const config = {
  emailFrom,
  emailTransport,
  emailAuthUsername,
  emailAuthPassword,
  emailReceivers,
  errorsReceiver,
  adsFile,
  njuskaloUrl,
  plaviUrl,
  notBeforeDateTime,
}
