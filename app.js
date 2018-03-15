const google 	= require('googleapis');
const express   = require('express');
const config 	= require('config');
const path		= require('path');

const Debouncer = require("./Debouncer");
const api 		= require("./api");
const promisify = require('./promisify');
const operations = require('./operations');
const template = require('./template');

const containersList = require("./data/list");

const OAuth2Client = google.auth.OAuth2;
const app = express();
const router = express.Router();

const oAuth2Client = new OAuth2Client(
	config.get("oauth.clientId"),
	config.get("oauth.clientSecret"),
	config.get("oauth.redirectURIs")
);

router.get('/', async (req, res) => {
	const code = req.query.code;
	if (!code){
		const url = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: [
				'https://www.googleapis.com/auth/analytics',
				'https://www.googleapis.com/auth/analytics.edit',
				// 'https://www.googleapis.com/auth/analytics.manage.users',
				'https://www.googleapis.com/auth/tagmanager.manage.accounts',
				'https://www.googleapis.com/auth/tagmanager.edit.containers',
				'https://www.googleapis.com/auth/tagmanager.readonly',
				'https://www.googleapis.com/auth/tagmanager.delete.containers',
				'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
				// 'https://www.googleapis.com/auth/tagmanager.manage.users',
				'https://www.googleapis.com/auth/tagmanager.publish'
			]
		});
		res.redirect(url);
	} else {
		try {
			oAuth2Client.credentials = await promisify(oAuth2Client.getToken, code, oAuth2Client);

			const deb = new Debouncer(5000);
			api.authorize(oAuth2Client);

			/* CREATE */
			// const operationsPromises = containersList.map(containerTemplate => operations.create(deb, api, containerTemplate));
			// await Promise.all(operationsPromises);

			/* DELETE */
			// await operations.delete(deb, api, containersList);

			res.end('DONE');
			/* UPDATE */
			let { container } = await deb.push(() => api.getContainers("accounts/2148927835"));
			container = container.slice(10);
            const updateTemplate = {
            	tags: [
					{
						"name": "panelBootstrapped event",
						"type": "ua",
						"parameter": [
							{
								"type": "BOOLEAN",
								"key": "nonInteraction",
								"value": "false"
							},
							{
								"type": "BOOLEAN",
								"key": "overrideGaSettings",
								"value": "true"
							},
							{
								"type": "TEMPLATE",
								"key": "eventValue",
								"value": "{{eventValue}}"
							},
							{
								"type": "LIST",
								"key": "fieldsToSet",
								"list": [
									{
										"type": "MAP",
										"map": [
											{
												"type": "TEMPLATE",
												"key": "fieldName",
												"value": "userId"
											},
											{
												"type": "TEMPLATE",
												"key": "value",
												"value": "{{USER ID}}"
											}
										]
									}
								]
							},
							{
								"type": "TEMPLATE",
								"key": "eventCategory",
								"value": "panelBootstrapped"
							},
							{
								"type": "TEMPLATE",
								"key": "trackType",
								"value": "TRACK_EVENT"
							},
							{
								"type": "TEMPLATE",
								"key": "eventAction",
								"value": "{{eventAction}}"
							},
							{
								"type": "TEMPLATE",
								"key": "eventLabel",
								"value": "{{eventLabel}}"
							},
							{
								"type": "TEMPLATE",
								"key": "trackingId",
								"value": "{{UA ID}}"
							}
						],
						"tagFiringOption": "ONCE_PER_EVENT",
						"triggers": ["panelBootstrapped trigger"]
					}
				],
				triggers: [
					{
						"name": "panelBootstrapped trigger",
						"type": "CUSTOM_EVENT",
						"customEventFilter": [
							{
								"type": "EQUALS",
								"parameter": [
									{
										"type": "TEMPLATE",
										"key": "arg0",
										"value": "{{_event}}"
									},
									{
										"type": "TEMPLATE",
										"key": "arg1",
										"value": "panelBootstrapped"
									}
								]
							}
						]
					}
				]
			};
            const operationsPromises = container.map(container =>
				operations.update(deb, api, updateTemplate, container, "Add panelBootstrapped")
			);
			await Promise.all(operationsPromises);

			/* GET DATA */
/*          const list = await api.getAnalyticsProperties();
            let { webProperties } = list.items.find(item => item.name === "Odin Dev");
			webProperties = webProperties.slice(0,2);

            const [dataTable, dataByHour] = await Promise.all([
				operations.getTimesTable(deb, api, webProperties),
				operations.getDataByHour(deb, api, webProperties)
			]);
			res.end(template(dataTable, dataByHour));	*/

			console.log("DONE");
		} catch(err){
			console.error('Error getting oAuth tokens: ' + err);
		}
	}
});

app.use('/', express.static(path.join(__dirname, './public')));
app.use('/gtm', router);

app.listen(3000);