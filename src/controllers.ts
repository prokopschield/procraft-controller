import { getConfig } from 'doge-config';
import Controller from './classes/Controller';

const ctrl_configs = getConfig('controllers');

const controllers: {
	[name: string]: Controller;
} = {};

for (const [name, def] of ctrl_configs.map.entries()) {
	controllers[name] = new Controller(def.flat);
}

export default module.exports = controllers;
