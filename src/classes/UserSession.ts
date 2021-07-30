import { Connection, ServerChannel, Session } from 'ssh2';
import Lang, { getLang } from './Lang';
import User from './User';

export enum UserSessionState {
	init,
}

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
		this.welcome();

		this.channel.stdin.on('data', (chunk: Buffer) => {
			const line = chunk.toString();
			this.keyhooks.get(line.trim())?.();
		});

		this.menu();
	}

	keyhooks = new Map<string, () => void>([
		[
			'\x1b',
			() => {
				switch (this.state) {
					default: {
						this.state = UserSessionState.init;
						this.println('');
					}
				}
			},
		],
	]);

	println(...lines: string[]) {
		for (const line of lines) {
			this.channel.stdout.write(`${line}\r\n`);
		}
	}

	welcome() {
		this.println('', this.lang.MSG_WELCOME, '');
		this.help();
	}

	help() {
		this.println(this.lang.MSG_HELP_KEY, this.lang.MSG_HELP_ESC);
	}

	menu() {
		this.println('');
	}
}
