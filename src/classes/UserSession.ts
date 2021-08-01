import chalk from 'chalk';
import { Connection, ServerChannel, Session } from 'ssh2';
import controllers from '../controllers';
import Controller from './Controller';
import Lang, { getLang } from './Lang';
import User from './User';

export enum UserSessionState {
	init,
	menu,
	hooked,
}

export type Options = Array<[string, () => void]>;

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

		this.keyhook();

		this.channel.on('close', () => this.user.removeSession(this));

		this.options_main_menu.push(
			[this.lang.MENU_SETTINGS, () => this.settings()],
			[this.lang.MENU_CONTROLLERS, () => this.controllers()]
		);

		this.options_settings.push([this.lang.MENU_MAIN, () => this.main_menu()]);

		this.welcome();
		this.main_menu(false);
	}

	keyhook() {
		this.channel.stdin.removeAllListeners('data');
		this.channel.stdin.on('data', this.keyhook_cb);
	}

	keyhook_cb = (chunk: Buffer) => {
		const line = chunk.toString();
		this.keyhooks.get(line.trim())?.();
	};

	/** Current keyhooks */
	keyhooks = new Map<string, () => void>([
		[
			'\x1b',
			() => {
				switch (this.state) {
					default: {
						if (this.hook) {
							this.hook.unhook(this.channel);
							this.hook = undefined;
						}
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
	options_main_menu: Options = [];

	/** Settings */
	options_settings: Options = [];

	/** Current menu options */
	options: Options = [];

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
		this.state = UserSessionState.menu;
		this.keyhook();
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

	hook?: Controller;

	/** Open the controllers menu to the User */
	controllers() {
		const opts: Options = [];
		for (const [name, controller] of Object.entries(controllers)) {
			if (this.user.hasPermission(`controllers.${name}`)) {
				opts.push([
					name,
					() => {
						this.clear(this.lang.MSG_HELP_ESC);
						controller.hook(this.channel);
						this.hook = controller;
						this.state = UserSessionState.hooked;
					},
				]);
			}
		}
		this.options = opts;
		this.active_menu_name = this.lang.MENU_CONTROLLERS;
		this.menu(true);
	}
}
