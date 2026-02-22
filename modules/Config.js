import fs from 'fs';

export default class Config {
	constructor() {
		this.CONFIG_FILE = 'config/config.json';
	}
	load() {
		this.data = JSON.parse(fs.readFileSync(this.CONFIG_FILE));
	}
}
