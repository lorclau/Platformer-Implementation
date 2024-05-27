class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 300;
        this.DRAG = 710;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -550;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
    }

    create() {

        // for text hints
        my.text.message1 = this.add.bitmapText(2250, 275, "rocketSquare", "").setScale(0.3);

        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 16, 16, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in tiled
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 62
        });

        // Find checkpoint in tiled
        this.checkpoint = this.map.createFromObjects("Objects", {
            name: "checkpoint",
            key: "tilemap_sheet",
            frame: 57
        });

        // Find key and blocks (lock-n-key puzzle elements)
        this.key = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 96
        });
        this.blocks = this.map.createFromObjects("Objects", {
            name: "block",
            key: "tilemap_sheet",
            frame: 7,
            visible: true
        });

        // Convert objects into arcade physics sprites
        this.physics.world.enable(this.checkpoint, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.key, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.blocks, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins, for collision detection
        this.coinGroup = this.add.group(this.coins);
        // Create group for this.blocks
        this.blockGroup = this.add.group(this.blocks);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(70, 200, "platformer_characters", "tile_0000.png");
        my.sprite.player.setFlip(true);
        my.sprite.player.score = 0;

        //put score to screen
        my.score = this.add.bitmapText(400, 220, "rocketSquare", "Score: " + my.sprite.player.score + " / 30");
        my.score.setScale(0.6);
        my.score.setScrollFactor(0,0);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.blockCollider = this.physics.add.collider(my.sprite.player, this.blockGroup);


        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {

            // play sound
            this.sound.play("playerCollect2", {
                volume: 0.8
            });

            // Start particle animation
            my.vfx.gemCollect = this.add.particles(obj2.x, obj2.y, "kenny-particles", {
                frame: 'star_06.png',
                speed: 100,
                lifespan: 1200,
                gravityY: 200,
                stopAfter: 5,
                scale: {start: 0.05, end: 0.01}
            });

            my.vfx.gemCollect.start();

            //update score
            my.sprite.player.score += 1;
            my.score.setText("Score: " + my.sprite.player.score + " / 30").setScale(0.6);

            obj2.destroy(); // remove coin on overlap
        });

        // Set up lock-n-key puzzle
        // Handle collision detection with key
        this.physics.add.overlap(my.sprite.player, this.blockGroup, (obj1, obj2) => {
            this.sound.play("unlock");
            obj2.setVisible(false);
            obj2.destroy();
        });

        this.physics.add.overlap(my.sprite.player, this.key, (obj1, obj2) => {
            this.sound.play("playerCollect1");
            this.blockCollider.destroy();
            //this.blockGroup.setVisible(false);
            obj2.destroy();
        });

        // Handle collision with checkpoint (end level condition)
        this.physics.add.overlap(my.sprite.player, this.checkpoint, (obj1, obj2) => {

            //player wins if has all coins when at checkpoint
            if(my.sprite.player.score == 30){

                obj2.destroy(); //remove checkpoint

                this.sound.play("win"); //play win sound

                //display win text to screen
                my.text.win = this.add.bitmapText(1863, 226, "rocketSquare", "YOU WIN!").setScale(2);

                setTimeout(() => {
                    this.scene.restart(); //restart level automatically after 4000 ms
                }, 4000);
            }
            //otherwise, tell player to collect more gems
            if(my.sprite.player.score != 30){
                my.text.message1.setText("Collect more gems!").setScale(0.3);
                setTimeout(() => {
                    my.text.message1.setText("");
                }, 2000);
            }

        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');
        
        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false; //turn off debug on start

        // movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['flame_01.png', 'flame_02.png', 'flame_03.png'],
            random: true,
            scale: {start: 0.03, end: 0.08},
            maxAliveParticles: 6,
            lifespan: 180,
            gravityY: -280,
            alpha: {start: 1, end: 0.1}, 
        });
        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: "light_02.png",
            speed: 100,
            lifespan: 450,
            gravityY: 750,
            scale: {start: 0.03, end: 0}
        });

        my.vfx.walking.stop();
        my.vfx.jumping.stop();

        // camera code
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {

        // Player movement left and right
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

            //particle following code
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
                my.vfx.jumping.stop();
            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            
            //particle following code
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-20, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
                my.vfx.jumping.stop();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            //have the vfx stop playing
            my.vfx.walking.stop();
            my.vfx.jumping.stop();
        }

        // Player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            my.vfx.walking.stop();
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            my.vfx.walking.stop();
            this.sound.play("playerJump");
            my.vfx.jumping.startFollow(my.sprite.player, my.sprite.player.displayWidth/2 - 10, my.sprite.player.displayHeight/2, false);
            my.vfx.jumping.start();
        }

        // test key
        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            //this.scene.restart();
            //console.log("x: " + my.sprite.player.x);
            //console.log("y: " + my.sprite.player.y);
        }
    }

}