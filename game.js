/**
 * Pokemon GO Web Edition - Main Game Engine & Controller
 */

class PokemonGoGame {
  constructor() {
    this.player = {
      name: "Trainer Gandhi",
      level: 1,
      xp: 0,
      stardust: 1200,
      pokecoins: 200,
      x: 0,
      y: 0,
      speed: 4,
      candies: {}, // { pokemonId: count }
      inventory: {
        pokeball: 30,
        greatball: 10,
        ultraball: 5,
        razzberry: 10,
        potion: 10
      },
      storage: [], // caught pokemon objects
      pokedexSeen: new Set([1, 4, 7, 25])
    };

    this.selectedBall = "pokeball";
    this.fedBerry = false;
    this.autoRoam = false;

    // Map entities
    this.wildPokemon = [];
    this.pokestops = [];
    this.gyms = [];

    // Encounter state
    this.activeEncounter = null;
    this.pokeballState = {
      x: 0, y: 0, vx: 0, vy: 0, vz: 0,
      isDragging: false,
      isThrown: false,
      scale: 1,
      targetRadius: 60,
      ringSize: 60,
      ringShrinking: true,
      shakes: 0,
      shakeTimer: 0,
      caught: false
    };

    // Gym state
    this.gymBattle = {
      active: false,
      bossHp: 1000,
      bossMaxHp: 1000,
      playerHp: 300,
      playerMaxHp: 300,
      energy: 0,
      bossPoke: null,
      playerPoke: null
    };

    this.init();
  }

  init() {
    this.loadSaveData();
    this.setupUI();
    this.setupCanvas();
    this.spawnMapEntities();
    this.bindEvents();
    this.updateStatusDisplay();

    // Start game loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  loadSaveData() {
    try {
      const data = localStorage.getItem("POKEMON_GO_SAVE");
      if (data) {
        const parsed = JSON.parse(data);
        this.player = { ...this.player, ...parsed };
        this.player.pokedexSeen = new Set(parsed.pokedexSeen || [1, 4, 7, 25]);
      }
    } catch(e) {}

    // Give starter Pokemon if storage is empty
    if (this.player.storage.length === 0) {
      const pikachu = POKEMON_DATA.find(p => p.id === 25);
      this.player.storage.push({
        uid: Date.now(),
        id: pikachu.id,
        name: pikachu.name,
        cp: 420,
        hp: pikachu.baseHp,
        maxHp: pikachu.baseHp,
        sprite: pikachu.sprite,
        type1: pikachu.type1,
        type2: pikachu.type2,
        fastMove: pikachu.fastMove,
        chargeMove: pikachu.chargeMove
      });
      this.player.candies[25] = 10;
    }
  }

  saveGame() {
    try {
      const toSave = {
        ...this.player,
        pokedexSeen: Array.from(this.player.pokedexSeen)
      };
      localStorage.setItem("POKEMON_GO_SAVE", JSON.stringify(toSave));
    } catch(e) {}
  }

  setupUI() {
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas.getContext("2d");

    this.encCanvas = document.getElementById("encounter-canvas");
    this.encCtx = this.encCanvas.getContext("2d");
  }

  setupCanvas() {
    const resize = () => {
      const rect = this.mapCanvas.parentElement.getBoundingClientRect();
      this.mapCanvas.width = rect.width;
      this.mapCanvas.height = rect.height;

      this.encCanvas.width = rect.width;
      this.encCanvas.height = rect.height;
    };
    window.addEventListener("resize", resize);
    resize();
  }

  spawnMapEntities() {
    this.pokestops = [
      { id: 1, name: "Tech Park Central", x: -140, y: -120, readyTime: 0 },
      { id: 2, name: "City Library Fountain", x: 180, y: -100, readyTime: 0 },
      { id: 3, name: "Botanical Garden Gate", x: -160, y: 160, readyTime: 0 },
      { id: 4, name: "Metro Terminal Station", x: 150, y: 140, readyTime: 0 }
    ];

    this.gyms = [
      { id: 1, name: "Valor Arena", x: 0, y: -240, bossId: 150 }
    ];

    this.spawnWildPokemon();
  }

  spawnWildPokemon() {
    const count = 5;
    while (this.wildPokemon.length < count) {
      const randPoke = POKEMON_DATA[Math.floor(Math.random() * POKEMON_DATA.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 180;
      const cpVar = Math.floor(randPoke.baseCP * (0.8 + Math.random() * 0.4));

      const img = new Image();
      img.src = randPoke.miniSprite;

      this.wildPokemon.push({
        uid: Date.now() + Math.random(),
        data: randPoke,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        cp: cpVar,
        image: img,
        spawnTime: Date.now(),
        despawnTime: Date.now() + 60000
      });

      this.player.pokedexSeen.add(randPoke.id);
    }
  }

  bindEvents() {
    // DPAD
    const move = (dx, dy) => {
      this.player.x += dx * 16;
      this.player.y += dy * 16;
      this.checkProximity();
    };

    document.getElementById("dpad-up").onclick = () => move(0, -1);
    document.getElementById("dpad-down").onclick = () => move(0, 1);
    document.getElementById("dpad-left").onclick = () => move(-1, 0);
    document.getElementById("dpad-right").onclick = () => move(1, 0);

    // Keyboard WASD / Arrows
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "w") move(0, -1);
      if (e.key === "ArrowDown" || e.key === "s") move(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a") move(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") move(1, 0);
    });

    // Auto roam toggle
    const roamBtn = document.getElementById("auto-roam-btn");
    roamBtn.onclick = () => {
      this.autoRoam = !this.autoRoam;
      roamBtn.classList.toggle("active", this.autoRoam);
      roamBtn.innerText = this.autoRoam ? "🧭 Auto Roam: ON" : "🧭 Auto Roam: OFF";
    };

    // Canvas click on map (tap to catch / tap pokestop)
    this.mapCanvas.onclick = (e) => {
      const rect = this.mapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const centerX = this.mapCanvas.width / 2;
      const centerY = this.mapCanvas.height / 2;

      // Check wild pokemon tap
      for (let p of this.wildPokemon) {
        const screenX = centerX + (p.x - this.player.x);
        const screenY = centerY + (p.y - this.player.y);
        const d = Math.hypot(clickX - screenX, clickY - screenY);
        if (d < 38) {
          this.startEncounter(p);
          return;
        }
      }

      // Check Pokestop tap
      for (let ps of this.pokestops) {
        const screenX = centerX + (ps.x - this.player.x);
        const screenY = centerY + (ps.y - this.player.y);
        const d = Math.hypot(clickX - screenX, clickY - screenY);
        if (d < 45) {
          this.openPokestop(ps);
          return;
        }
      }

      // Check Gym tap
      for (let g of this.gyms) {
        const screenX = centerX + (g.x - this.player.x);
        const screenY = centerY + (g.y - this.player.y);
        const d = Math.hypot(clickX - screenX, clickY - screenY);
        if (d < 50) {
          this.openGym(g);
          return;
        }
      }
    };

    // Main Menu & Screen navigation
    const showScreen = (id) => {
      document.querySelectorAll(".overlay-screen").forEach(s => s.style.display = "none");
      if (id) document.getElementById(id).style.display = "flex";
    };

    document.getElementById("btn-main-menu").onclick = () => showScreen("menu-screen");
    document.getElementById("btn-close-menu").onclick = () => showScreen(null);

    document.getElementById("menu-btn-pokemon").onclick = () => { showScreen("pokedex-screen"); this.renderStorage(); };
    document.getElementById("menu-btn-pokedex").onclick = () => { showScreen("pokedex-screen"); this.renderPokedex(); };
    document.getElementById("menu-btn-bag").onclick = () => { showScreen("bag-screen"); this.renderBag(); };
    document.getElementById("menu-btn-gym").onclick = () => { showScreen("gym-screen"); this.startGymBattle(); };
    document.getElementById("menu-btn-reset").onclick = () => {
      if (confirm("Reset all game data and start over?")) {
        localStorage.removeItem("POKEMON_GO_SAVE");
        location.reload();
      }
    };

    document.getElementById("btn-close-pokedex").onclick = () => showScreen(null);
    document.getElementById("btn-close-bag").onclick = () => showScreen(null);
    document.getElementById("btn-close-pokestop").onclick = () => showScreen(null);
    document.getElementById("btn-close-gym").onclick = () => { showScreen(null); this.gymBattle.active = false; };
    document.getElementById("btn-flee").onclick = () => { showScreen(null); sfx.playFlee(); };

    document.getElementById("btn-nearby").onclick = () => { showScreen("pokedex-screen"); this.renderPokedex(); };
    document.getElementById("btn-bag").onclick = () => { showScreen("bag-screen"); this.renderBag(); };

    // Pokestop disc spin
    const disc = document.getElementById("pokestop-disc");
    disc.onclick = () => this.spinPokestop();

    // Catch screen Pokeball physics
    this.setupEncounterThrow();

    // Catch modal OK
    document.getElementById("btn-catch-ok").onclick = () => {
      document.getElementById("catch-modal").style.display = "none";
      showScreen(null);
      this.updateStatusDisplay();
    };

    // Toggle ball type & feed berry
    document.getElementById("btn-toggle-ball").onclick = () => {
      const types = ["pokeball", "greatball", "ultraball"];
      let curIdx = types.indexOf(this.selectedBall);
      this.selectedBall = types[(curIdx + 1) % types.length];
      this.updateBallDisplay();
    };

    document.getElementById("btn-feed-berry").onclick = () => {
      if (this.player.inventory.razzberry > 0 && !this.fedBerry) {
        this.player.inventory.razzberry--;
        this.fedBerry = true;
        sfx.playHit();
        alert("Fed Razz Berry! Catch chance increased!");
        this.updateBallDisplay();
      }
    };

    // Gym battle attack controls
    document.getElementById("btn-gym-attack").onclick = () => this.gymFastAttack();
    document.getElementById("btn-gym-charge").onclick = () => this.gymChargeAttack();
    document.getElementById("btn-gym-dodge").onclick = () => this.gymDodge();
  }

  updateStatusDisplay() {
    document.getElementById("display-trainer-lvl").innerText = `Lv. ${this.player.level} • ${this.player.xp} XP`;
    document.getElementById("display-stardust").innerText = this.player.stardust.toLocaleString();
    document.getElementById("display-coins").innerText = this.player.pokecoins.toLocaleString();
    this.saveGame();
  }

  updateBallDisplay() {
    const ballNames = { pokeball: "Poké Ball", greatball: "Great Ball", ultraball: "Ultra Ball" };
    document.getElementById("current-ball-name").innerText = ballNames[this.selectedBall];
    document.getElementById("count-ball").innerText = this.player.inventory[this.selectedBall];
    document.getElementById("count-berry").innerText = this.player.inventory.razzberry;
  }

  checkProximity() {
    // Check if new wild pokemon need to spawn
    this.wildPokemon = this.wildPokemon.filter(p => Date.now() < p.despawnTime);
    this.spawnWildPokemon();
  }

  startEncounter(pokemon) {
    this.activeEncounter = pokemon;
    this.fedBerry = false;
    document.getElementById("encounter-screen").style.display = "flex";
    document.getElementById("enc-name").innerText = pokemon.data.name;
    document.getElementById("enc-cp").innerText = `CP ${pokemon.cp}`;

    this.updateBallDisplay();

    // Reset Pokeball throw state
    this.pokeballState = {
      x: this.encCanvas.width / 2,
      y: this.encCanvas.height - 90,
      vx: 0, vy: 0, vz: 0,
      isDragging: false,
      isThrown: false,
      scale: 1,
      targetRadius: 60,
      ringSize: 60,
      ringShrinking: true,
      shakes: 0,
      shakeTimer: 0,
      caught: false,
      escaped: false
    };

    this.pokeImg = new Image();
    this.pokeImg.src = pokemon.data.sprite;
  }

  setupEncounterThrow() {
    let startX = 0, startY = 0, startTime = 0;

    const onStart = (clientX, clientY) => {
      if (this.pokeballState.isThrown) return;
      const rect = this.encCanvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const d = Math.hypot(x - this.pokeballState.x, y - this.pokeballState.y);
      if (d < 50) {
        this.pokeballState.isDragging = true;
        startX = x;
        startY = y;
        startTime = performance.now();
      }
    };

    const onMove = (clientX, clientY) => {
      if (!this.pokeballState.isDragging || this.pokeballState.isThrown) return;
      const rect = this.encCanvas.getBoundingClientRect();
      this.pokeballState.x = clientX - rect.left;
      this.pokeballState.y = clientY - rect.top;
    };

    const onEnd = () => {
      if (!this.pokeballState.isDragging || this.pokeballState.isThrown) return;
      this.pokeballState.isDragging = false;

      const dy = this.pokeballState.y - startY;
      const dx = this.pokeballState.x - startX;
      const dt = Math.max(50, performance.now() - startTime);

      if (dy < -30 && this.player.inventory[this.selectedBall] > 0) {
        this.player.inventory[this.selectedBall]--;
        this.updateBallDisplay();
        this.pokeballState.isThrown = true;
        this.pokeballState.vx = (dx / dt) * 14;
        this.pokeballState.vy = (dy / dt) * 16;
        sfx.playThrow();
      } else {
        // Snap back
        this.pokeballState.x = this.encCanvas.width / 2;
        this.pokeballState.y = this.encCanvas.height - 90;
      }
    };

    this.encCanvas.addEventListener("mousedown", e => onStart(e.clientX, e.clientY));
    window.addEventListener("mousemove", e => onMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", onEnd);

    this.encCanvas.addEventListener("touchstart", e => {
      if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener("touchmove", e => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener("touchend", onEnd);
  }

  triggerCatchSuccess() {
    const poke = this.activeEncounter;
    this.wildPokemon = this.wildPokemon.filter(p => p.uid !== poke.uid);

    this.player.storage.push({
      uid: Date.now(),
      id: poke.data.id,
      name: poke.data.name,
      cp: poke.cp,
      hp: poke.data.baseHp,
      maxHp: poke.data.baseHp,
      sprite: poke.data.sprite,
      type1: poke.data.type1,
      type2: poke.data.type2,
      fastMove: poke.data.fastMove,
      chargeMove: poke.data.chargeMove
    });

    this.player.candies[poke.data.id] = (this.player.candies[poke.data.id] || 0) + 3;
    this.player.stardust += 100;
    this.player.xp += 150;

    // Check level up
    if (this.player.xp >= this.player.level * 500) {
      this.player.level++;
      sfx.playLevelUp();
      alert(`🎉 Congratulations! You reached Trainer Level ${this.player.level}!`);
    }

    sfx.playCatchSuccess();

    // Show catch modal
    document.getElementById("catch-modal-img").src = poke.data.sprite;
    document.getElementById("catch-modal-title").innerText = `Gotcha! ${poke.data.name} was caught!`;
    document.getElementById("catch-modal-cp").innerText = poke.cp;
    document.getElementById("catch-modal").style.display = "flex";
  }

  openPokestop(ps) {
    this.currentPokestop = ps;
    document.getElementById("pokestop-screen").style.display = "flex";
    document.getElementById("pokestop-title").innerText = `Pokéstop: ${ps.name}`;
    document.getElementById("pokestop-loot").innerHTML = "";
  }

  spinPokestop() {
    const disc = document.getElementById("pokestop-disc");
    disc.classList.add("spinning");
    sfx.playPokestopSpin();

    setTimeout(() => {
      disc.classList.remove("spinning");
      // Give items
      const items = ["🔴 Poké Ball x3", "🔵 Great Ball x1", "🍇 Razz Berry x2", "💊 Potion x1"];
      this.player.inventory.pokeball += 3;
      this.player.inventory.greatball += 1;
      this.player.inventory.razzberry += 2;
      this.player.inventory.potion += 1;
      this.player.xp += 50;
      this.updateStatusDisplay();

      const lootContainer = document.getElementById("pokestop-loot");
      lootContainer.innerHTML = items.map(it => `<div class="loot-bubble">${it.split(" ")[0]}</div>`).join("");
    }, 800);
  }

  renderStorage() {
    document.getElementById("pokedex-title").innerText = `Pokémon Storage (${this.player.storage.length})`;
    const grid = document.getElementById("pokemon-grid");
    grid.innerHTML = this.player.storage.map(p => `
      <div class="pokemon-card" onclick="game.powerUpPokemon(${p.uid})">
        <span class="pokemon-card-cp">CP ${p.cp}</span>
        <img src="${p.sprite}" class="pokemon-card-img">
        <span class="pokemon-card-name">${p.name}</span>
        <span style="font-size: 10px; color: #94a3b8;">${p.fastMove}</span>
      </div>
    `).join("");
  }

  powerUpPokemon(uid) {
    const p = this.player.storage.find(x => x.uid === uid);
    if (!p) return;
    if (this.player.stardust >= 200 && (this.player.candies[p.id] || 0) >= 1) {
      this.player.stardust -= 200;
      this.player.candies[p.id] -= 1;
      p.cp += Math.floor(25 + Math.random() * 20);
      sfx.playCatchSuccess();
      this.renderStorage();
      this.updateStatusDisplay();
    } else {
      alert("Need 200 Stardust and 1 Candy to Power Up!");
    }
  }

  renderPokedex() {
    document.getElementById("pokedex-title").innerText = `Pokédex (${this.player.pokedexSeen.size}/${POKEMON_DATA.length})`;
    const grid = document.getElementById("pokemon-grid");
    grid.innerHTML = POKEMON_DATA.map(p => {
      const seen = this.player.pokedexSeen.has(p.id);
      return `
        <div class="pokemon-card" style="opacity: ${seen ? 1 : 0.4}">
          <span class="pokemon-card-cp">#${p.id}</span>
          <img src="${seen ? p.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}" class="pokemon-card-img">
          <span class="pokemon-card-name">${seen ? p.name : '???'}</span>
          <span style="font-size: 10px; color: ${TYPE_COLORS[p.type1]}">${p.type1}</span>
        </div>
      `;
    }).join("");
  }

  renderBag() {
    const list = document.getElementById("bag-items-list");
    const inv = this.player.inventory;
    list.innerHTML = `
      <div style="background:#334155; padding:12px; border-radius:12px; display:flex; justify-content:space-between;">
        <span>🔴 Poké Ball</span><b>${inv.pokeball}</b>
      </div>
      <div style="background:#334155; padding:12px; border-radius:12px; display:flex; justify-content:space-between;">
        <span>🔵 Great Ball</span><b>${inv.greatball}</b>
      </div>
      <div style="background:#334155; padding:12px; border-radius:12px; display:flex; justify-content:space-between;">
        <span>🟡 Ultra Ball</span><b>${inv.ultraball}</b>
      </div>
      <div style="background:#334155; padding:12px; border-radius:12px; display:flex; justify-content:space-between;">
        <span>🍇 Razz Berry</span><b>${inv.razzberry}</b>
      </div>
      <div style="background:#334155; padding:12px; border-radius:12px; display:flex; justify-content:space-between;">
        <span>💊 Potion</span><b>${inv.potion}</b>
      </div>
    `;
  }

  startGymBattle() {
    this.gymBattle.active = true;
    this.gymBattle.bossHp = 1000;
    this.gymBattle.playerHp = 350;
    this.gymBattle.energy = 0;
    this.updateGymUI();
  }

  gymFastAttack() {
    if (!this.gymBattle.active) return;
    this.gymBattle.bossHp -= 35;
    this.gymBattle.energy = Math.min(100, this.gymBattle.energy + 15);
    sfx.playAttack();

    // Boss counters
    if (Math.random() < 0.6) {
      this.gymBattle.playerHp -= 20;
    }

    this.checkGymEnd();
    this.updateGymUI();
  }

  gymChargeAttack() {
    if (!this.gymBattle.active || this.gymBattle.energy < 50) {
      alert("Charge move not ready yet! Build energy with Fast Attacks.");
      return;
    }
    this.gymBattle.bossHp -= 140;
    this.gymBattle.energy -= 50;
    sfx.playSuperEffective();
    this.checkGymEnd();
    this.updateGymUI();
  }

  gymDodge() {
    sfx.playShake();
    alert("Dodged the incoming boss attack!");
  }

  checkGymEnd() {
    if (this.gymBattle.bossHp <= 0) {
      this.gymBattle.active = false;
      sfx.playCatchSuccess();
      alert("🏆 VICTORY! You defeated the Raid Boss! Awarded 1,000 XP & 500 Stardust!");
      this.player.xp += 1000;
      this.player.stardust += 500;
      this.updateStatusDisplay();
    } else if (this.gymBattle.playerHp <= 0) {
      this.gymBattle.active = false;
      sfx.playFlee();
      alert("Defeated! Revive your Pokémon and try again!");
    }
  }

  updateGymUI() {
    const bossPct = Math.max(0, (this.gymBattle.bossHp / 1000) * 100);
    const playerPct = Math.max(0, (this.gymBattle.playerHp / 350) * 100);
    document.getElementById("boss-hp-bar").style.width = `${bossPct}%`;
    document.getElementById("player-hp-bar").style.width = `${playerPct}%`;
  }

  gameLoop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // Auto roam logic
    if (this.autoRoam) {
      this.player.x += Math.cos(time * 0.001) * 1.5;
      this.player.y += Math.sin(time * 0.001) * 1.5;
      this.checkProximity();
    }

    this.renderMap();
    this.renderEncounter();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  renderMap() {
    const ctx = this.mapCtx;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background map grid
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    // Draw road / radar grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetX = (w / 2 - this.player.x) % gridSize;
    const offsetY = (h / 2 - this.player.y) % gridSize;

    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const cx = w / 2;
    const cy = h / 2;

    // Pulse radar ring around player
    const pulse = (performance.now() * 0.05) % 90;
    ctx.strokeStyle = `rgba(56, 189, 248, ${1 - pulse / 90})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Pokestops
    for (let ps of this.pokestops) {
      const sx = cx + (ps.x - this.player.x);
      const sy = cy + (ps.y - this.player.y);
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏛️", sx, sy + 4);
    }

    // Draw Gyms
    for (let g of this.gyms) {
      const sx = cx + (g.x - this.player.x);
      const sy = cy + (g.y - this.player.y);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(sx, sy, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚔️", sx, sy + 5);
    }

    // Draw Wild Pokemon
    for (let p of this.wildPokemon) {
      const sx = cx + (p.x - this.player.x);
      const sy = cy + (p.y - this.player.y);

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + 18, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (p.image.complete) {
        ctx.drawImage(p.image, sx - 28, sy - 28, 56, 56);
      }
    }

    // Draw Player Avatar
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  renderEncounter() {
    if (document.getElementById("encounter-screen").style.display !== "flex") return;
    const ctx = this.encCtx;
    const w = this.encCanvas.width;
    const h = this.encCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 40;

    // Draw Pokemon
    if (this.pokeImg && this.pokeImg.complete) {
      ctx.drawImage(this.pokeImg, cx - 80, cy - 80, 160, 160);
    }

    // Draw Shrinking Target Ring
    if (!this.pokeballState.isThrown) {
      this.pokeballState.ringSize -= 0.6;
      if (this.pokeballState.ringSize < 15) this.pokeballState.ringSize = 65;

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, this.pokeballState.ringSize, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Pokeball
    const pb = this.pokeballState;
    if (pb.isThrown) {
      pb.x += pb.vx;
      pb.y += pb.vy;
      pb.vy += 0.45; // Gravity
      pb.scale = Math.max(0.4, pb.scale - 0.015);

      // Hit detection
      const d = Math.hypot(pb.x - cx, pb.y - cy);
      if (d < 45 && !pb.hit) {
        pb.hit = true;
        sfx.playHit();

        // Calculate capture probability
        const baseRate = this.activeEncounter.data.catchRate;
        const ballBonus = this.selectedBall === "ultraball" ? 2.0 : (this.selectedBall === "greatball" ? 1.5 : 1.0);
        const berryBonus = this.fedBerry ? 1.5 : 1.0;
        const chance = Math.min(0.95, baseRate * ballBonus * berryBonus);

        setTimeout(() => {
          sfx.playShake();
          setTimeout(() => {
            sfx.playShake();
            setTimeout(() => {
              if (Math.random() < chance) {
                this.triggerCatchSuccess();
              } else {
                sfx.playFlee();
                alert("Oh no! The Pokémon broke free!");
                this.startEncounter(this.activeEncounter);
              }
            }, 600);
          }, 600);
        }, 500);
      }
    }

    // Render Pokeball graphic
    ctx.save();
    ctx.translate(pb.x, pb.y);
    ctx.scale(pb.scale, pb.scale);

    ctx.fillStyle = this.selectedBall === "ultraball" ? "#eab308" : (this.selectedBall === "greatball" ? "#3b82f6" : "#ef4444");
    ctx.beginPath();
    ctx.arc(0, 0, 24, Math.PI, 0, false);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI, false);
    ctx.fill();

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// Instantiate global game controller
window.game = new PokemonGoGame();
