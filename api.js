const google = require('googleapis');
const tagmanager = google.tagmanager('v2');
const analytics = google.analytics('v3');
const reporting = google.analyticsreporting('v4');
const promisify = require('./promisify');

let oAuth2Client;

function sanitize(params){
	["accountId", "containerId", "fingerprint", "parentFolderId", "triggerId", "firingTriggerId", "tagId"].forEach(
		propName => delete params[propName]
	);

	return params;
}

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
		params = sanitize(params);

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
	async createBuildVar({ type, parent }){
		return promisify(
			tagmanager.accounts.containers.workspaces.built_in_variables.create,
			{
				auth: oAuth2Client,
				parent,
				type
			}
		);
	},
	async createTrigger({ params, parent }){
		params = sanitize(params);

		return promisify(
			tagmanager.accounts.containers.workspaces.triggers.create,
			{
				auth: oAuth2Client,
				parent,
				resource: params
			}
		);
	},
	async createAnalytics({ accountId, params }){
		return promisify(
			analytics.management.webproperties.insert,
			{
				auth: oAuth2Client,
				accountId,
				resource: params
			}
		);
	},
	async getReports(params){
		return promisify(
			reporting.reports.batchGet,
			{
				auth: oAuth2Client,
				resource: params
			}
		);
	},
	async getContainers(parent){
        return promisify(
            tagmanager.accounts.containers.list,
            {
                auth: oAuth2Client,
                parent
            }
        );
	},
	async deleteContainer(path){
        return promisify(
            tagmanager.accounts.containers.delete,
            {
                auth: oAuth2Client,
                path
            }
        );
	},
    async createVersion({ path, resource }){
        return promisify(
            tagmanager.accounts.containers.workspaces.create_version,
            {
                auth: oAuth2Client,
                path,
				resource
            }
        );
    },
    async publishContainer(path){
        return promisify(
            tagmanager.accounts.containers.versions.publish,
            {
                auth: oAuth2Client,
                path
            }
        );
    },
	async getAnalyticsProperties(){
        return promisify(
            analytics.management.accountSummaries.list,
            {
                auth: oAuth2Client
            }
        );
	}
};

module.exports = api;