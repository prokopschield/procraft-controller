import chalk from 'chalk';
import { Connection, ServerChannel, Session } from 'ssh2';
import Lang, { getLang } from './Lang';
import User from './User';

export enum UserSessionState {
	init,
	menu,
}

/**
 * User Session object - where all the fun happens
 */
export default class UserSession {
	client: Connection;
	user: User;
	session: Session;
	channel: ServerChannel;
	lang: Lang;
	state: UserSessionState = UserSessionState.init;

	constructor(
		client: Connection,
		user: User,
		session: Session,
		channel: ServerChannel
	) {
		this.client = client;
		this.user = user;
		this.session = session;
		this.channel = channel;

		this.lang = getLang(this.user.data.str.lang);

		this.channel.stdin.on('data', (chunk: Buffer) => {
			const line = chunk.toString();
			this.keyhooks.get(line.trim())?.();
		});

		this.channel.on('close', () => this.user.removeSession(this));

		this.options_main_menu.push([
			this.lang.MENU_SETTINGS,
			() => this.settings(),
		]);

		this.options_settings.push([this.lang.MENU_MAIN, () => this.main_menu()]);

		this.welcome();
		this.main_menu(false);
	}

	/** Current keyhooks */
	keyhooks = new Map<string, () => void>([
		[
			'\x1b',
			() => {
				switch (this.state) {
					default: {
						this.state = UserSessionState.init;
						this.main_menu();
					}
				}
			},
		],
	]);

	/** Name of currently open menu */
	active_menu_name: string = '\x1b[A';

	/** Display Settings to User */
	settings(clear_screen: boolean = true) {
		this.options = [...this.options_settings];
		this.active_menu_name = this.lang.MENU_SETTINGS;
		this.menu(clear_screen);
	}

	/** Display main menu to User */
	main_menu(clear_screen: boolean = true) {
		this.options = [...this.options_main_menu];
		this.active_menu_name = this.lang.MENU_MAIN;
		this.menu(clear_screen);
	}

	/** Main menu entries */
	options_main_menu = Array<[string, () => void]>();

	/** Settings */
	options_settings = Array<[string, () => void]>();

	/** Current menu options */
	options = Array<[string, () => void]>();

	/**
	 * Write lines to User's Terminal
	 * @param lines Lines to write to User's Terminal
	 */
	println(...lines: string[]) {
		for (const line of lines) {
			this.channel.stdout.write(`${line}\r\n`);
		}
	}

	/**
	 * Clear the User's Terminal
	 * @param lines Lines to write to User's Terminal
	 */
	clear(...lines: string[]) {
		this.channel.stdout.write('\x1b[2J\x1b[H');
		this.println.apply(this, lines);
	}

	/**
	 * Print the Welcome message to the User
	 */
	welcome() {
		this.clear(this.lang.MSG_WELCOME, '');
		this.help();
	}

	/**
	 * Print the HELP message to the User
	 */
	help() {
		this.println(this.lang.MSG_HELP_KEY, this.lang.MSG_HELP_ESC);
	}

	/**
	 * Open a menu to the User
	 */
	menu(clear_screen: boolean = false) {
		if (clear_screen) {
			this.clear();
		} else {
			this.println('');
		}
		this.println(this.active_menu_name);
		const clear = () => {
			for (let i = 0; i < this.options.length; ++i) {
				this.keyhooks.delete(`${i}`);
			}
		};
		for (const [index, [text, fn]] of Object.entries(this.options)) {
			this.println(
				`${chalk.white()}[${chalk.gray()}${index}${chalk.white()}]${chalk.green()} ${text}`
			);
			this.keyhooks.set(index, () => {
				clear();
				fn();
			});
		}
		this.println('');
	}
}
