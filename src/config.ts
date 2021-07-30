import { getConfig } from 'doge-config';

export default getConfig('procraft-controller', {
	AUTO_UPDATE: true,
	DEFAULT_LANG: 'en',
	SSH_KEYS: [
		{
			private: './config/id_rsa',
			public: './config/id_rsa.pub',
		},
	],
	SSH_PORT: 2222,
});
