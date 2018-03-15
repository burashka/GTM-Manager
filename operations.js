const template = require("./data/template.json");
const cloneDeep = require('clone-deep');

const configReport = {
    "reportRequests": [{
        "dateRanges": [{
            "startDate": "2018-02-01",
            "endDate": "2018-02-14"
        }],
        "dimensions": [{
            "name": "ga:eventLabel"
        }],
        "metrics": [
            { "expression": "ga:avgEventValue" },
            { "expression": "ga:totalEvents" }
        ],
		"orderBys": [{ "fieldName": "ga:eventLabel" }]
    }]
};

const categories = ["shown", "nav", "context", "ready"];

async function getReportByCategory(deb, api, webProperties, filtersExpression, propertyName) {
    const promises = webProperties.map(webProperty => {
        const config = cloneDeep(configReport);
        config.reportRequests[0].viewId = webProperty.profiles[0].id;
        config.reportRequests[0].filtersExpression = filtersExpression;

        return api.getReports(config);
    });

    const responses = await Promise.all(promises);
    const data = [];
    responses.forEach(({ reports }) => {
    	reports[0].data.rows.forEach(({ dimensions, metrics }) => {
    		const viewId = dimensions[0];
    		const value = +metrics[0].values[0];
            const total = +metrics[0].values[1];

            const viewData = data.find(view => view.viewId === viewId);
            if (!viewData){
            	data.push({
					viewId,
					[propertyName]: { value, total }
				});
			} else {
            	const oldValue = viewData[propertyName].value;
            	const oldTotal = viewData[propertyName].total;
                viewData[propertyName].total = oldTotal + total;
            	viewData[propertyName].value = (oldValue*oldTotal + value*total)/viewData[propertyName].total;
			}
		});
	});

    return data;
}

const operations = {
	async create(deb, api, containerTemplate){
		const analyticsVar = template.vars.find(item => item.name === "UA ID");
		analyticsVar.parameter[0].value = containerTemplate.analytics;

		const container = await deb.push(() => {
			return api.createContainer({
				parent: `accounts/${containerTemplate.account}`,
				name: containerTemplate.name
			})
		});

		await this.update(deb, api, template, container, "Init");
	},
	async update(deb, api, updateTemplate, container, versionName){
		const localTemplate = cloneDeep(updateTemplate);

		const workspace = await deb.push(() => api.getWorkspaces(container.path));
		const workspacePath = workspace[0].path;

		const varsPromises = (localTemplate.vars || []).map(params => deb.push(() => api.createVar({
			parent: workspacePath,
			params
		})));

		const buildVarsPromises = (localTemplate.buildVars || []).map(({type}) => deb.push(() => api.createBuildVar({
			parent: workspacePath,
			type
		})));

		const triggers = await Promise.all(
			(localTemplate.triggers || []).map(params => deb.push(() => api.createTrigger({
				parent: workspacePath,
				params
			})))
		);

		const tagsPromises = (localTemplate.tags || []).map(tag => {
			tag.firingTriggerId = [];
			tag.triggers.forEach(triggerName => {
				const trigger = triggers.find(item => item.name === triggerName);
				tag.firingTriggerId.push(trigger ? trigger.triggerId : triggerName);
			});
			delete tag.triggers;

			return deb.push(() => api.createTag({
				parent: workspacePath,
				params: tag
			}))
		});

		await Promise.all(tagsPromises.concat(varsPromises, buildVarsPromises));

		const { containerVersion } = await deb.push(() => {
			return api.createVersion({
				path: workspacePath,
				resource: { name: versionName }
			});
		});

		await deb.push(() => api.publishContainer(containerVersion.path));

		console.log(container.name, container.publicId);
	},
	async delete(deb, api, containersList){
        const containers = await api.getContainers("accounts/2148927835");
        const containersPromises = containersList.map(container => {
            const containerObject = containers.container.find(item => container.name === item.name);
            if (!containerObject) return Promise.resolve();

            return deb.push(() => api.deleteContainer(containerObject.path));
        });
        return Promise.all(containersPromises);
	},
	async getTimesTable(deb, api, webProperties){
        const data = [];
        const responses = await Promise.all([
            getReportByCategory(deb, api, webProperties, "ga:eventCategory=~shown", "shown"),
        	getReportByCategory(deb, api, webProperties, "ga:eventCategory=~navigationResponded", "nav"),
            getReportByCategory(deb, api, webProperties, "ga:eventCategory=~context", "context"),
            getReportByCategory(deb, api, webProperties, "ga:eventCategory=~ready", "ready")
		]);

        responses.forEach((response, idx) => {
        	response.forEach(row => {
        		const view = data.find(({ viewId }) => viewId === row.viewId);
        		if (!view){
        			if (idx === 0) {
                        data.push(row);
                    }
				} else {
        			const category = categories[idx];
					view[category] = row[category];
				}
			});
		});

        return data;
	},
	async getDataByHour(deb, api, webProperties){
        const promises = webProperties.map(webProperty => {
            return api.getReports({
                "reportRequests": [{
                	"viewId": webProperty.profiles[0].id,
                    "dateRanges": [{
                        "startDate": "2018-02-14",
                        "endDate": "2018-02-14"
                    }],
                    "dimensions": [{
                        "name": "ga:hour"
                    }],
                    "metrics": [
                        { "expression": "ga:avgEventValue" },
                        { "expression": "ga:totalEvents" }
                    ],
                    "orderBys": [{ "fieldName": "ga:hour" }]
                }]
            });
        });

        const responses = await Promise.all(promises);

        const hours = {};
        for(var i=0; i<24; i++){
            hours[i > 9 ? i.toString() : ("0" + i)] = 0;
        }
        const data = [hours, cloneDeep(hours)];
        responses.forEach(({ reports }) => {
            reports[0].data.rows.forEach(({dimensions, metrics}) => {
                const hour = dimensions[0];
                const value = +metrics[0].values[0];
                const total = +metrics[0].values[1];

                const oldValue = data[0][hour];
				const oldTotal = data[1][hour];
				data[1][hour] = oldTotal + total;
                data[0][hour] = (oldValue*oldTotal + value*total)/(data[1][hour]);
            });
        });

        return data;
	}
};

module.exports = operations;