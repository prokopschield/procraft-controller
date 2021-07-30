import { getConfig } from 'doge-config';
import {
	Connection,
	PublicKey,
	Server as ssh_server,
	ServerChannel,
	ServerConfig as ssh_server_config,
	Session,
} from 'ssh2';
import User, { getUser } from './User';
import UserSession from './UserSession';

interface ServerConfig extends ssh_server_config {
	port: number;
}

const users = getConfig('users');

const lastPublicKeyUser = new WeakMap<Connection, PublicKey>();
const isHooked = new WeakMap<Connection, boolean>();

export default class Server extends ssh_server {
	constructor(config: ServerConfig) {
		super(config, (client, info) => {
			client.on('authentication', (ctx) => {
				if (ctx.username in users) {
					const user = getUser(ctx.username);
					if (ctx.method === 'publickey') {
						if (user.verifyPublicKey(ctx.key)) {
							ctx.accept();
							this.sessionHook(client, user);
						} else {
							ctx.reject(['publickey', 'password']);
						}
					} else if (ctx.method === 'password') {
						if (user.verifyPassword(ctx.password)) {
							ctx.accept();
							this.sessionHook(client, user);
						} else {
							ctx.reject(['publickey', 'password']);
						}
					} else {
						ctx.reject(['publickey', 'password']);
					}
				} else if (ctx.username.match(/^[a-z]{3,16}$/)) {
					if (ctx.method === 'publickey') {
						lastPublicKeyUser.set(client, ctx.key);
						ctx.reject(['password']);
					} else if (ctx.method === 'password') {
						const pubkey = lastPublicKeyUser.get(client);
						if (pubkey) {
							// Create user! :)
							const user = getUser(ctx.username);
							user.setPassword(ctx.password);
							user.setPublicKey(pubkey);
							ctx.accept();
							this.sessionHook(client, user);
						} else {
							ctx.reject([
								'publickey',
								'Please generate a public key using `ssh-keygen`',
							]);
						}
					} else {
						ctx.reject(['publickey', 'password']);
					}
				} else {
					ctx.reject(['Username must be 3-16 lowercase characters']);
				}
			});
		});
		this.listen(config.port);
	}
	sessionHook(client: Connection, user: User) {
		if (isHooked.get(client)) return;
		else isHooked.set(client, true);
		client.on('session', (accept) => {
			const session = accept();
			this.sessionInit(client, user, session);
		});
	}
	sessionInit(client: Connection, user: User, session: Session) {
		session.on('pty', (accept) => accept && accept());
		session.on('exec', (accept) =>
			this.channelInit(client, user, session, accept())
		);
		session.on('shell', (accept) =>
			this.channelInit(client, user, session, accept())
		);
	}
	channelInit(
		client: Connection,
		user: User,
		session: Session,
		channel: ServerChannel
	) {
		user.addSession(new UserSession(client, user, session, channel));
	}
}
