import { ConfigField, getConfig } from 'doge-config';
import { hash, verify } from 'doge-passwd';
import { PublicKey } from 'ssh2';
import UserSession from './UserSession';

const userdata = getConfig('users');

export default class User {
	data: ConfigField;
	perm: ConfigField;
	sessions = new Set<UserSession>();
	constructor(name: string) {
		this.data = userdata.__getField(name);
		this.perm = this.data.obj.perm;
	}
	setPublicKey(key: PublicKey) {
		return this.data.__set('pubkey', hash(key.data));
	}
	verifyPublicKey(key: PublicKey): boolean {
		return verify(key.data, this.data.str.pubkey);
	}
	setPassword(password: string) {
		return this.data.__set('passwd', hash(password));
	}
	verifyPassword(password: string): boolean {
		return verify(password, this.data.str.passwd);
	}
	addSession(session: UserSession) {
		return this.sessions.add(session);
	}
	removeSession(session: UserSession) {
		return this.sessions.delete(session);
	}

	/**
	 * Set the state of a permission
	 *
	 * To grant a permission, pass `${permission}`
	 *
	 * To revoke a permission, pass `-${permission}`
	 *
	 * @param {string} permission Permission string
	 * @returns {boolean} State of permission after change
	 */

	setPermission(permission: string): boolean {
		let state = 1;
		while (permission[0] === '-') {
			state ^= 1;
			permission = permission.substr(1);
		}
		return !!this.perm.__set(permission, !!state);
	}

	/**
	 * Check, whether the User has, or had, a permission
	 *
	 * To check whether the User **has** a permission, pass `${permission}`
	 *
	 * To check whether the User **had** a permission, pass `-${permission}`
	 *
	 * @param {string} permission Permission string
	 * @returns {boolean} Check result
	 */
	hasPermission(permission: string): boolean {
		let state = 1;
		while (permission[0] === '-') {
			state ^= 1;
			permission = permission.substr(1);
		}
		return permission in this.perm && this.perm.__get(permission) == state;
	}

	/**
	 * Grant a permission to the User
	 *
	 * Returns false if the User already had said permission
	 *
	 * @param {string} permission Permission string
	 * @returns {boolean} Whether the permission was **granted**
	 */
	givePermission(permission: string): boolean {
		return (
			!this.hasPermission(permission) && this.setPermission(`${permission}`)
		);
	}

	/**
	 * Revoke a permission from the User
	 *
	 * Returns false if the User did NOT have said permission
	 *
	 * @param {string} permission Permission string
	 * @returns {boolean} Whether the permission was **revoked**
	 */
	revokePermission(permission: string): boolean {
		return (
			this.hasPermission(permission) && !this.setPermission(`-${permission}`)
		);
	}
}

export const users = new Map<string, User>();

function initUser(name: string): User {
	const user = new User(name);
	users.set(name, user);
	return user;
}

export function getUser(name: string): User {
	return users.get(name) || initUser(name);
}
