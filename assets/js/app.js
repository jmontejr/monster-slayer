new Vue({
    el: '#app',
    data: {
        running: false,
        game: {
            new: true,
            level: 1,
            nextLevel: false
        },
        name: '',
        error: false,
        player: {
            life: 100,
            name: '',
            coins: 0,
            level: 1,
            experience: {
                min: 0,
                max: 10
            }
        },
        characters: [],
        monsters: [],
        monster: {},
        logs: [],
        dropped: {
            coins: 0,
            exp: 0
        }
    },
    created: function () {
        this.getGamerInfo();
    },
    methods: {
        getGamerInfo() {
            fetch('./assets/js/game.json')
                .then(result => result.json())
                .then(data => {
                    const { characters, monsters } = data;
                    this.characters = characters;
                    this.monsters = monsters;
                    this.setMonsterRound();
                }).catch(e => console.error(e));
        },
        setPlayer(character) {
            if(this.name && this.name.length > 0) {
                const name  = this.name;
                this.player = { ...this.player, ...character, name };
                this.game.new = !this.game.new;
            } else {
                this.error = true;
                return false;
            }
        },
        startGame() {
            if(this.monster.life === 0 && 
                (this.monster.difficulty === this.monsters.length)) {
                this.resetMonsters();
            }
            
            this.running = true;
            this.player.life = 100;
            this.monster.life = 100;
            this.logs = [];

            if(this.game.nextLevel) {
                this.game.level++;
            }

            if(this.game.level === 1) {
                this.player.level = 1;
                this.player.experience.min = 0;
                this.player.experience.max = 10;
                this.player.coins = 0;
                this.player.skills.power = 1;
                this.player.skills.special = 1;
            }
            this.setMonsterRound();
        },
        attack(special) {
            const min = 4 + this.player.skills.power;
            const max = 9 + this.player.skills.power;
            this.hurt({
                prop: 'monster', min, max, special,
                source: this.player.name, target: this.monster.name, cls: 'player'
            });
            if(this.monster.life > 0) {
                const min = 6 + this.monster.difficulty;
                const max = 11  + this.monster.difficulty;

                this.hurt({
                    prop: 'player', min, max, special: false, 
                    source: this.monster.name, target: this.player.name, cls: 'monster'
                });
            }
        },
        hurt(data) {
            const { prop, min, max, special, source, target, cls } = data;
            const plus = special ? 4 + this.player.skills.special : 0;
            const hurt = this.getRandom(min + plus, max + plus);
            this[prop].life = Math.max(this[prop].life - hurt, 0);
            this.registerLog(`${source} hit the ${target} with ${hurt} damage.`, cls);

            if((this.monster.life === 0) && (this.game.level < this.monsters.length)) {
                this.game.nextLevel = true;
            } else if((this.monster.life === 0) && (this.game.level === this.monsters.length)) {
                this.game.nextLevel = false;
            } else if (this.player.life === 0) {
                this.resetMonsters();
            }
        },
        healAndHurt() {
            let min = 10 + (this.player.level * 2);
            let max = 15  + (this.player.level * 2);
            this.heal(min, max);
            min = 6 + this.monster.difficulty;
            max = 11  + this.monster.difficulty;
            this.hurt({ 
                prop: 'player', min, max, special: false,
                source: this.monster.name, target: this.player.name, cls: 'monster'
            });
        },
        heal(min, max) {
            const heal = this.getRandom(min, max);
            this.player.life = Math.min(this.player.life + heal, 100);
            this.registerLog(`The ${this.player.name} recovered ${heal} health.`, 'player');
        },
        getRandom(min, max) {
            const value = Math.random() * (max - min) + min;
            return Math.round(value);
        },
        registerLog(text, cls) {
            this.logs.unshift({ text, cls })
        },
        setMonsterRound() {
            const { level } = this.game;
            this.monster = this.searchValueInKeyInListObjects(level, 'difficulty', this.monsters)[0];
        },
        resetMonsters() {
            this.game.level = 1;
            this.game.nextLevel = false;
        },
        searchValueInKeyInListObjects(value, prop, myArray) {
            const result = [];
            myArray.map(function(objectIterate) {
                if (objectIterate[prop] === value) {
                    result.push(objectIterate);
                }
            });
            return result;
        },
        setCoinsDropped() {
            this.dropped.coins = this.getRandom(this.monster.drop.reward.min, this.monster.drop.reward.max);
            this.player.coins += this.dropped.coins;

        },
        setExpDropped() {
            this.dropped.exp = this.getRandom(this.monster.drop.experience.min, this.monster.drop.experience.max);
            this.player.experience.min += this.dropped.exp;
        }
    },
    computed: {
        hasResult() {
            return this.player.life == 0 || this.monster.life == 0;
        },
        year() {
            return new Date().getFullYear();
        }
    },
    watch: {
        name(newest, oldest) {
            this.error = newest && newest.length > 0 ? false : true;
        },
        hasResult(newest, oldest) {
            if (newest) {
                this.running = false;
                this.setCoinsDropped();
                this.setExpDropped();
            }
        },
        'player.experience.min'(newest, oldest) {
            if (newest >= this.player.experience.max) {
                this.player.level++;
                this.player.skills.power++;
                this.player.skills.special += 1;
                const excedente = newest - this.player.experience.max;
                if(this.game.level < this.monsters.length) {
                    this.player.experience.max += this.monsters[this.game.level].drop.experience.max;
                    this.player.experience.min = excedente;
                }
            }
        }
    }
});