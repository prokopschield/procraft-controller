import Config from 'doge-config';
import path from 'path';
import config from '../config';

const { DEFAULT_LANG } = config.str;

export default class Lang {
	config: Config;
	constructor(lang: string) {
		this.config = new Config(
			lang,
			{},
			path.resolve(__dirname, '../../src', 'langs')
		);
	}
	get(key: string): string {
		const val = this.config.__getString(key);
		if (val) return val;
		const deflang = getLang(DEFAULT_LANG);
		const defval = this === deflang ? 'LANG_KEY_MISSING' : deflang.get(key);
		this.config.__set(key, defval);
		return defval;
	}
	get MSG_WELCOME() {
		return this.get('MSG_WELCOME');
	}
	get MSG_HELP_ESC() {
		return this.get('MSG_HELP_ESC');
	}
	get MSG_HELP_KEY() {
		return this.get('MSG_HELP_KEY');
	}
	get MENU_MAIN() {
		return this.get('MENU_MAIN');
	}
	get MENU_SETTINGS() {
		return this.get('MENU_SETTINGS');
	}
	get MENU_CONTROLLERS() {
		return this.get('MENU_CONTROLLERS');
	}
}

const langs = new Map<string, Lang>();

export function getLang(lang: string = DEFAULT_LANG): Lang {
	lang ||= DEFAULT_LANG;
	return langs.get(lang) || (langs.set(lang, new Lang(lang)), getLang(lang));
}
