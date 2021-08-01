import { Client, ClientChannel, ConnectConfig, ServerChannel } from 'ssh2';
import { EventEmitter } from 'stream';
import { Queue } from './Queue';

export interface ControllerOptions {
	auth: ConnectConfig;
	command_delay?: number;
	scripts: {
		init?: string[];
	};
}

type str = string | Buffer;

export default class Controller extends EventEmitter {
	client: Client;
	shell?: ClientChannel;
	command_queue: Queue<str>;
	last_stdout: number = Date.now();
	last_stderr: number = Date.now();
	last_output: number = Date.now();
	command_delay: number;
	constructor(opts: ControllerOptions) {
		super();
		this.client = new Client();
		this.command_queue = new Queue<str>();
		this.command_delay = +(opts.command_delay || 1200);
		this.init(opts);
	}
	init(opts: ControllerOptions) {
		const self = this;
		this.client.connect(opts.auth);
		this.client.on('ready', () => {
			this.client.shell({}, (err, channel) => {
				this.shell = channel;
				this.shell.stdout.on('data', (chunk: Buffer) => {
					self.emit('stdout', chunk);
					self.emit('output', chunk);
					this.last_stdout = this.last_output = Date.now();
				});
				this.shell.stderr.on('data', (chunk: Buffer) => {
					self.emit('stderr', chunk);
					self.emit('output', chunk);
					this.last_stdout = this.last_output = Date.now();
				});
				this.command_queue.values.length = 0;
				opts.scripts.init && this.command_queue.add(opts.scripts.init);
				this.executor_trigger();
			});
		});
	}
	async executor_trigger() {
		while (true) {
			const value_array = this.command_queue.values;
			const { value: p } = this.command_queue.next();
			const cmd = await p;
			while (Date.now() < this.last_output + this.command_delay) {
				await new Promise((resolve) =>
					setTimeout(
						resolve,
						Date.now() - this.last_output + this.command_delay
					)
				);
			}
			if (cmd) {
				if (this.shell) {
					if (typeof cmd !== 'string' || cmd[cmd.length - 1] === '\n') {
						this.shell.write(cmd);
					} else {
						this.shell.write(`${cmd}\n`);
					}
					await new Promise((resolve) =>
						setTimeout(resolve, this.command_delay)
					);
				} else {
					value_array.unshift(cmd);
				}
			}
		}
	}
	run(cmd: str) {
		this.command_queue.add(cmd);
	}
	hook(client: ServerChannel): boolean {
		try {
			if (!this.shell) return false;
			const current_hook = hooks.get(client);
			if (current_hook) {
				current_hook.unhook(client);
			}
			const stdin_hook =
				hooks_stdin.get(this) ||
				((chunk: Buffer) => this.shell && this.shell.stdin.write(chunk));
			client.stdin.on('data', stdin_hook);
			const stdout_hook =
				hooks_stdout.get(client) ||
				((chunk: Buffer) => client.stdout.write(chunk));
			this.shell.stdout.on('data', stdout_hook);
			this.shell.stderr.on('data', stdout_hook);
			hooks.set(client, this);
			hooks_stdin.set(this, stdin_hook);
			hooks_stdout.set(client, stdout_hook);
			return true;
		} catch (e) {
			return false;
		}
	}
	unhook(client: ServerChannel): boolean {
		if (!this.shell) return false;
		const stdin_hook = hooks_stdin.get(this);
		if (stdin_hook) {
			client.stdin.removeListener('data', stdin_hook);
		}
		const stdout_hook = hooks_stdout.get(client);
		if (stdout_hook) {
			this.shell.stdout.removeListener('data', stdout_hook);
			this.shell.stderr.removeListener('data', stdout_hook);
		}
		hooks.delete(client);
		return true;
	}
}

type DataHook = (chunk: Buffer) => void;

const hooks = new WeakMap<ServerChannel, Controller>();
const hooks_stdin = new WeakMap<Controller, DataHook>();
const hooks_stdout = new WeakMap<ServerChannel, DataHook>();
