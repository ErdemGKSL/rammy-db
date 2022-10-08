
![RammyDB Text](https://cdn.discordapp.com/attachments/887446333047312464/1028347470977191946/RammyLong.png "RammyDB Text")

# RammyDB

Stores data in disk and ram synchronously.

## Supports Custom Classes
Supports custom classes but only works if #toJSON() returns constructor argument.

## Example

```js
const { RamDB, toCustomClass } = require("rammy-db");
const path = require("path");

class Game { constructor(arg) { this.data = {}; for (let i in arg) { this.data[i] = arg[i] } }; toJSON() { return {...this.data} } }
class User { constructor(arg) { this.data = {}; for (let i in arg) { this.data[i] = arg[i] } }; toJSON() { return {...this.data} } }

const db = new RamDB({
	path: path.resolve(process.cwd(), "./data.json"),
	timeout: 5000,
	default: {
		/** @type {Game[]} */
		games: [],
		queueData: {
			/** @type {string[]} */
			players: [],
			size: 0
		},
		/** @type {User[]} */
		users: []
	},
	customClasses: [toCustomClass(User), toCustomClass(Game)]
});

module.exports = db;
```
