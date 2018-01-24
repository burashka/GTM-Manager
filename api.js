const google = require('googleapis');
const tagmanager = google.tagmanager('v2');
const promisify = require('./promisify');

let oAuth2Client;

const api = {
	authorize(obj){
		oAuth2Client = obj;
	},
	async getAccounts(){
		const { account } = await promisify(
			tagmanager.accounts.list,
			{
				auth: oAuth2Client
			},
			tagmanager.accounts
		);
		return account;
	},
	async createContainer({ name, parent }) {
		return promisify(
			tagmanager.accounts.containers.create,
			{
				auth: oAuth2Client,
				parent,
				resource: {
					name,
					usageContext: ["web"]
				}
			}
		);
	},
	async createWorkspace({ params, parent }) {
		return promisify(
			tagmanager.accounts.containers.workspaces.create,
			{
				auth: oAuth2Client,
				parent,
				resource: params
			}
		);
	},
	async getWorkspaces(parent){
		const { workspace } = await promisify(
			tagmanager.accounts.containers.workspaces.list,
			{
				auth: oAuth2Client,
				parent
			},
			tagmanager.accounts.containers.workspaces
		);
		return workspace;
	},
	async createTag({ params, parent }){
		return promisify(
			tagmanager.accounts.containers.workspaces.tags.create,
			{
				auth: oAuth2Client,
				parent,
				resource: params
			}
		);
	},
	async createVar({ params, parent }){
		return promisify(
			tagmanager.accounts.containers.workspaces.variables.create,
			{
				auth: oAuth2Client,
				parent,
				resource: params
			}
		);
	},
	async createTrigger({ params, parent }){
		return promisify(
			tagmanager.accounts.containers.workspaces.triggers.create,
			{
				auth: oAuth2Client,
				parent,
				resource: params
			}
		);
	}
};

module.exports = api;