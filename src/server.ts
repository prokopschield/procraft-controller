import { ConfigField } from 'doge-config';
import fs from 'fs';
import Server from './classes/Server';
import config from './config';

const port = config.num.SSH_PORT;
const keyObjs = [...config.obj.SSH_KEYS.array].filter(
	(a) => a instanceof ConfigField
) as ConfigField[];
const hostKeys = keyObjs.map((a) => fs.readFileSync(a.str.private));

export default module.exports = new Server({
	port,
	hostKeys,
});
