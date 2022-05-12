# Data Retention Manager for Salesforce Privacy Center


*Note:* Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

Author: Alex Conway

Data Retention Manager provides a way to schedule deletion of the retention tables used by Privacy Center on a periodic basis.
The delete process runs once per day at the hour selected, and applies to the tables/objects selected.

The app uses two dynos: 1 for the web app and scheduling, and 1 for scheduled delete operations.

## Setup Instructions

### Create a Heroku App
Create a new Heroku app in the same Private Space as your Privacy Center app.
Deploy the source code (https://github.com/ajcsf/pc-delete) to the app.
Attach the Privacy Center instances of Redis and Postgres to the new app so it can access those resources. See https://devcenter.heroku.com/changelog-items/646

### Create a Salesforce Connected App
Create a Connected App in your Salesforce Org.
- Connected App Name: AJC_DRM
- API Name: AJC_DRM
- Contact Email: your email address
- Enable OAuth Settings: ticked
- Callback URL: Your new Heroku App URL with "_callback" appended. Example: https://yourapp.herokuapp.com/_callback
- Selected OAuth Scopes: openid
- Require Secret for Web Server Flow: ticked

Access to this Connected App governs access to the Data Retention Manager app, so ideally you want to restrict it to the users nominated to manage that app.
In OAuth Policies, set Permitted Users to "Admin approved users are pre-authorized", and then limit access by selecting a Profile or a Permission Set that matches
only the Salesforce users you want to access Data Retention Manager.

### Configure Environment Variables
The following environment variables must be set in your Heroku App.

- CACHE_SCHEMA [Name of the schema used by Privacy Center to store retained data in Postgres. Defaults to  "cache".]
- TIMEZONE [Enter your timezone name here. Defaults to "Europe/London". See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones]
- DATABASE_URL [Attach your Privacy Center Postgres instance.]
- REDIS_URL [Attach your Privacy Center Redis instance.]
- CONSUMER_KEY [Your Salesforce Connected App consumer key.]
- CONSUMER_SECRET [Your Salesforce Connected App consumer secret.]
- INSTANCE_URL [Your Salesforce instance URL. Find it in Setup -> My Domain, "Current My Domain URL" value. Example: https://yourorg.my.salesforce.com]
- REDIRECT_URL [Your Heroku App URL with "_callback" appended. Example: https://yourapp.herokuapp.com/_callback]
