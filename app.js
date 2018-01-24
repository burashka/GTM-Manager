const google 	= require('googleapis');
const express   = require('express');
const config 	= require('config');

const Debouncer = require("./Debouncer");
const api 		= require("./api");
const promisify = require('./promisify');

const template = require("./data/template.json");

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
				'https://www.googleapis.com/auth/tagmanager.manage.accounts',
				'https://www.googleapis.com/auth/tagmanager.edit.containers'
				// 'https://www.googleapis.com/auth/tagmanager.delete.containers',
				// 'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
				// 'https://www.googleapis.com/auth/tagmanager.manage.users',
				// 'https://www.googleapis.com/auth/tagmanager.publish'
			]
		});
		res.redirect(url);
	} else {
		try {
			oAuth2Client.credentials = await promisify(oAuth2Client.getToken, code, oAuth2Client);
			res.end('Authentication successful! Please return to the console.');

			const deb = new Debouncer(500);
			api.authorize(oAuth2Client);

			const container = await deb.push(() => {
				return api.createContainer({
					parent: `accounts/${template.account}`,
					name: "cp.XX.stg.cloud.im"
				})
			});

			const workspace = await deb.push(() => {
				return api.getWorkspaces(container.path)
			});

			const tagsPromises = template.tags.
				map(tag => deb.push(() => api.createTag({
					parent: workspace[0].path,
					params: tag
				})));

			const varsPromises = template.vars.
				map(params => deb.push(() => api.createVar({
					parent: workspace[0].path,
					params
				})));

			const triggersPromises = template.triggers.
				map(params => deb.push(() => api.createTrigger({
					parent: workspace[0].path,
					params
				})));

			await Promise.all(tagsPromises.concat(varsPromises, triggersPromises));
		} catch(err){
			console.error('Error getting oAuth tokens: ' + err);
		}
	}
});

app.use('/gtm', router);

app.listen(3000);