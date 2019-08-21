# njuskalo-crawler

## Env variables

You must create `.env` file and specify bellow env variables:

```bash
# Required
EMAIL_AUTH_PASSWORD=
EMAIL_AUTH_USERNAME=
EMAIL_TRANSPORT=
EMAIL_FROM=
EMAIL_RECEIVERS=
ERRORS_RECEIVER=
ADS_FILE=
# Moment compatible time string 
NOT_BEFORE_DATE_TIME=

# Optional, use an URL with preselected query options from the relevant site 
NJUSKALO_URL=
PLAVI_URL=
```

## Run

```bash
yarn install
yarn start
```
