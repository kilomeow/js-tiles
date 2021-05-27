var map = {
    cols: 12,
    rows: 12,
    tsize: 64,
    layers: [[
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3,
        3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
        3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
        3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
        3, 1, 1, 1, 1, 2, 2, 1, 2, 1, 1, 3,
        3, 1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 3,
        3, 1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 3,
        3, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3,
        3, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 3,
        3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
        3, 3, 3, 1, 1, 2, 3, 3, 3, 3, 3, 3
    ], [
        4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4,
        4, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 4,
        4, 0, 0, 0, 0, 0, 5, 5, 0, 5, 0, 4,
        4, 0, 0, 5, 5, 0, 0, 0, 0, 5, 0, 4,
        4, 0, 0, 5, 5, 0, 5, 5, 0, 0, 0, 4,
        4, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 4,
        4, 0, 0, 5, 5, 0, 5, 5, 0, 5, 0, 4,
        4, 0, 0, 0, 5, 0, 5, 5, 0, 5, 0, 4,
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
        4, 4, 4, 0, 5, 4, 4, 4, 4, 4, 4, 4,
        4, 4, 4, 0, 0, 3, 3, 3, 3, 3, 3, 3
    ]],
    getTile: function (layer, col, row) {
        return this.layers[layer][row * map.cols + col];
    },
    isSolidTileAtXY: function (pos) {
        var col = Math.floor(pos.x / this.tsize);
        var row = Math.floor(pos.y / this.tsize);

        // tiles 3 and 5 are solid -- the rest are walkable
        // loop through all layers and return TRUE if any tile is solid
        return this.layers.reduce(function (res, layer, index) {
            var tile = this.getTile(index, col, row);
            var isSolid = tile === 3 || tile === 5;
            return res || isSolid;
        }.bind(this), false);
    },
    getCol: function (x) {
        return Math.floor(x / this.tsize);
    },
    getRow: function (y) {
        return Math.floor(y / this.tsize);
    },
    getX: function (col) {
        return col * this.tsize;
    },
    getY: function (row) {
        return row * this.tsize;
    }
};

function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
}

Camera.prototype.follow = function (sprite) {
    this.following = sprite;
    sprite.screenX = 0;
    sprite.screenY = 0;
};

Camera.prototype.update = function () {
    // assume followed sprite should be placed at the center of the screen
    // whenever possible
    this.following.screenX = this.width / 2;
    this.following.screenY = this.height / 2;

    // make the camera follow the sprite
    this.x = this.following.x - this.width / 2;
    this.y = this.following.y - this.height / 2;
    // clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));

    // in map corners, the sprite cannot be placed in the center of the screen
    // and we have to change its screen coordinates

    // left and right sides
    if (this.following.x < this.width / 2 ||
        this.following.x > this.maxX + this.width / 2) {
        this.following.screenX = this.following.x - this.x;
    }
    // top and bottom sides
    if (this.following.y < this.height / 2 ||
        this.following.y > this.maxY + this.height / 2) {
        this.following.screenY = this.following.y - this.y;
    }
};

function Hero(map, x, y) {
    this.map = map;
    this.x = x;
    this.y = y;
    this.width = map.tsize;
    this.height = map.tsize;

    this.image = Loader.getImage('hero');
}

Hero.SPEED = 256; // pixels per second

_move = (pos, walk, target, collide) => {
    let d = target - pos;
    let dir = Math.sign(d);

    let end = pos + dir*walk;

    let coord = end;

    if (collide(end)) {
        coord = map.tsize*Math.floor(pos/map.tsize) + Math.floor(map.tsize/2);
    } else if ((end - target)*dir >= 0) {
        coord = target;
    }

    return {
        coord,
        remaining: walk-Math.abs(coord - pos)
    }

}

var EPSILON = 0.001;

Hero.prototype.corner = function (pos, dir) {
    return {
        x: pos.x + dir.x*Math.floor(this.width/2)  -dir.x,
        y: pos.y + dir.y*Math.floor(this.height/2) -dir.y,
    }
}

Hero.prototype._is_collide = function (x, y) {
    pos = {x, y};
    return map.isSolidTileAtXY(this.corner(pos, {x: -1, y: -1})) ||
           map.isSolidTileAtXY(this.corner(pos, {x:  1, y: -1})) ||
           map.isSolidTileAtXY(this.corner(pos, {x: -1, y:  1})) ||
           map.isSolidTileAtXY(this.corner(pos, {x:  1, y:  1}))
}

Hero.prototype.move = function (delta, target) {
    let target_x = map.getX(target.col) + Math.floor(this.width/2);
    let target_y = map.getY(target.row) + Math.floor(this.height/2);

    let move_x = _move(this.x, Hero.SPEED*delta, target_x, (x) => this._is_collide(x, this.y));
    this.x = move_x.coord;
    let move_y = _move(this.y, move_x.remaining, target_y, (y) => this._is_collide(this.x, y))
    this.y = move_y.coord;
    let move2_x = _move(this.x, move_y.remaining, target_x, (x) => this._is_collide(x, this.y));
    this.x = move_x.coord;

    return (move2_x.remaining > EPSILON);
};

Hero.prototype._collide = function (dirx, diry) {
    var row, col;
    // -1 in right and bottom is because image ranges from 0..63
    // and not up to 64
    var left = this.x - this.width / 2;
    var right = this.x + this.width / 2 - 1;
    var top = this.y - this.height / 2;
    var bottom = this.y + this.height / 2 - 1;

    // check for collisions on sprite sides
    var collision =
        this.map.isSolidTileAtXY(left, top) ||
        this.map.isSolidTileAtXY(right, top) ||
        this.map.isSolidTileAtXY(right, bottom) ||
        this.map.isSolidTileAtXY(left, bottom);
    if (!collision) { return; }

    if (diry > 0) {
        row = this.map.getRow(bottom);
        this.y = -this.height / 2 + this.map.getY(row);
    }
    else if (diry < 0) {
        row = this.map.getRow(top);
        this.y = this.height / 2 + this.map.getY(row + 1);
    }
    else if (dirx > 0) {
        col = this.map.getCol(right);
        this.x = -this.width / 2 + this.map.getX(col);
    }
    else if (dirx < 0) {
        col = this.map.getCol(left);
        this.x = this.width / 2 + this.map.getX(col + 1);
    }
};

Game.load = function () {
    return [
        Loader.loadImage('tiles', '../assets/tiles.png'),
        Loader.loadImage('hero', '../assets/character.png')
    ];
};

Game.init = function () {
    this.target = null;
    var game = this;
    this.canvas.addEventListener('mousedown', function(e) {
        const rect = game.canvas.getBoundingClientRect()
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const target_x = game.camera.x + x;
        const target_y = game.camera.y + y;
        game.target = {col: map.getCol(target_x),
                       row: map.getRow(target_y)};
        console.log(game.target)
    });
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');

    this.hero = new Hero(map, 160, 160);
    this.camera = new Camera(map, 512, 512);
    this.camera.follow(this.hero);
};

Game.update = function (delta) {
    // handle hero movement with arrow keys
    var dirx = 0;
    var diry = 0;
    if (this.target) {
        let reached = this.hero.move(delta, this.target);
        if (reached) {this.target = null;}
    }
    this.camera.update();
};

Game._drawLayer = function (layer, target=null) {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile(layer, c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            target_tile = target && (c == target.col) && (r == target.row);
            if (tile !== 0) { // 0 => empty tile
                this.ctx.drawImage(
                    this.tileAtlas, // image
                    (tile - 1) * map.tsize, // source x
                    0, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
            if (target_tile) {
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
                this.ctx.beginPath()
                this.ctx.lineWidth = 3;
                let r = Math.floor(map.tsize/2);
                this.ctx.arc(
                    Math.round(x) + r,  // target x
                    Math.round(y) + r, // target y
                    r-3, // target width
                    0,
                    2 * Math.PI // target height
                );
                this.ctx.stroke()
            }
        }
    }
};

Game._drawGrid = function () {
    var width = map.cols * map.tsize;
    var height = map.rows * map.tsize;
    var x, y;
    for (var r = 0; r < map.rows; r++) {
        x = - this.camera.x;
        y = r * map.tsize - this.camera.y;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
    }
    for (var c = 0; c < map.cols; c++) {
        x = c * map.tsize - this.camera.x;
        y = - this.camera.y;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
    }
};

Game.render = function () {
    // draw map background layer
    this._drawLayer(0, this.target);

    // draw main character
    this.ctx.drawImage(
        this.hero.image,
        this.hero.screenX - this.hero.width / 2,
        this.hero.screenY - this.hero.height / 2);

    // draw map top layer
    this._drawLayer(1);

    //this._drawGrid();
};
