import { getConfigDir } from 'doge-config';
import fs from 'fs';
import path from 'path';
import Controller, { ControllerOptions } from './classes/Controller';

const ctrl_dir = path.resolve('config/controllers');
if (!fs.existsSync(ctrl_dir)) fs.mkdirSync(ctrl_dir, { recursive: true });
const list = fs
	.readdirSync(ctrl_dir)
	.map((a) => a.replace('' + path.extname(a), ''));
const cfgs = getConfigDir('controllers');

const controllers: {
	[name: string]: Controller;
} = {};

for (const name of list) {
	const cfg = cfgs[name];
	const def: ControllerOptions = {
		auth: {
			host: cfg.obj.auth.__getString('host'),
		},
		scripts: {},
	};
	for (const key of cfg.obj.auth.map.keys()) {
		Object.assign(def.auth, { [key]: cfg.obj.auth.__getString(key) });
	}
	for (const key of cfg.obj.scripts.map.keys()) {
		Object.assign(def.scripts, { [key]: [...cfg.obj.scripts.__getArray(key)] });
	}
	controllers[name] = new Controller(def);
}

export default module.exports = controllers;
