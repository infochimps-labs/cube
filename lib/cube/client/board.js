cube.board = function(url, id) {
  var board = {id: id},
      socket,
      interval,
      pieceId = 0,
      palette,
      squares,
      pieces = [],
      size = [47, 47], // in number of squares
      squareSize = 20, // in pixels
      squareRadius = 0, // in pixels
      padding = 0; // half-pixel for crisp strokes

  var event = d3.dispatch(
    "size",
    "squareSize",
    "squareRadius",
    "padding",
    "view"
  );

  var svg = document.createElementNS(d3.ns.prefix.svg, "svg");

  d3.select(svg)
      .attr("class", "board");
  

  event.on("size.board", resize);
  event.on("squareSize.board", resize);
  event.on("squareRadius.board", resize);
  event.on("padding.board", resize);

  function message(message) {
    console.log(message)
    var e = JSON.parse(message.data);
    switch (e.type) {
      case "view": {
        event.view.call(board, e);
        break;
      }
      case "add": {
        var piece = board.add(cube.piece.type[e.piece.type])
            .fromJSON(e.piece)
            .on("move.board", move);

        d3.select(piece.node())
            .style("opacity", 1e-6)
          .transition()
            .duration(500)
            .style("opacity", 1);

        pieceId = Math.max(pieceId, piece.id = e.piece.id);
        break;
      }
      case "edit": {
        pieces.some(function(piece) {
          if (piece.id == e.piece.id) {
            piece
                .on("move.board", null)
                .transition(d3.transition().duration(500))
                .fromJSON(e.piece);

            // Renable events after transition starts.
            d3.timer(function() { piece.on("move.board", move); }, 250);
            return true;
          }
        });
        break;
      }
      case "move": {
        pieces.some(function(piece) {
          if (piece.id == e.piece.id) {
            piece
                .on("move.board", null)
                .transition(d3.transition().duration(500))
                .size(e.piece.size)
                .position(e.piece.position);

            // Bring to front.
            svg.parentNode.appendChild(piece.node());

            // Renable events after transition starts.
            d3.timer(function() { piece.on("move.board", move); }, 250);
            return true;
          }
        });
        break;
      }
      case "remove": {
        pieces.some(function(piece) {
          if (piece.id == e.piece.id) {
            board.remove(piece, true);
            return true;
          }
        });
        break;
      }
    }
  }

  function reopen() {
    if (socket) {
      pieces.slice().forEach(function(piece) { board.remove(piece, true); });
      socket.close();
    }
    socket = new WebSocket(url);
    socket.onopen = load;
    socket.onmessage = message;
    if (!interval) interval = setInterval(ping, 5000);
  }
  
  function send(json){
    if(socket && socket.readyState == 1){
      try{
        socket.send(json);
      } catch (error) {
        console.log("Error sending to websocket: " + error);
      }
    }
  }

  function load() {
    if (id) send(JSON.stringify({type: "load", id: id}));
  }

  function ping() {
    if (socket.readyState > 1) {
      reopen();
    } else {
      send(JSON.stringify({type: "ping", id: id}));
    }
  }

  // A one-time listener to send an add event on mouseup.
  function add() {
    if(mode==='edit') {
      send(JSON.stringify({type: "add", id: id, piece: this}));
      this.on("move.board", move);
    }
  }

  function move() {
    if(mode==='edit') send(JSON.stringify({type: "move", id: id, piece: this}));
  }

  function edit() {
    if(mode==='edit') send(JSON.stringify({type: "edit", id: id, piece: this}));
  }

  function resize() {
    d3.select(svg)
        .attr("width", size[0] * squareSize + 2 * padding)
        .attr("height", size[1] * squareSize + 2 * padding);    

    if(mode == "edit") d3.select(squares.node())
        .attr("transform", "translate(" + padding + ","+ padding + ")");
  }
  
  
  board.node = function() {
    return svg;
  };

  board.on = function(type, listener) {
    event.on(type, listener);
    return board;
  };

  board.size = function(x) {
    if (!arguments.length) return size;
    event.size.call(board, size = x);
    return board;
  };

  board.squareSize = function(x) {
    if (!arguments.length) return squareSize;
    event.squareSize.call(board, squareSize = x);
    return board;
  };

  board.squareRadius = function(x) {
    if (!arguments.length) return squareRadius;
    event.squareRadius.call(board, squareRadius = x);
    return board;
  };

  board.padding = function(x) {
    if (!arguments.length) return padding;
    event.padding.call(board, padding = x);
    return board;
  };

  board.add = function(type) {
    var piece = type(board);
    piece.id = ++pieceId;
    piece.on("move.board", add).on("edit.board", edit);
    svg.parentNode.appendChild(piece.node());
    pieces.push(piece);
    return piece;
  };

  board.remove = function(piece, silent) {
    piece.on("move.board", null).on("edit.board", null);
    if (silent) {
      d3.select(piece.node())
          .style("opacity", 1)
        .transition()
          .duration(500)
          .style("opacity", 1e-6)
          .remove();
    } else {
      socket.send(JSON.stringify({type: "remove", id: id, piece: {id: piece.id}}));
      svg.parentNode.removeChild(piece.node());
    }
    pieces.splice(pieces.indexOf(piece), 1);
    return piece;
  };

  board.toJSON = function() {
    return {id: id, size: size, pieces: pieces};
  };
  if(mode == "edit") {
    cube.palette(board);
    svg.appendChild((squares = cube.squares(board)).node());
  }
  resize();
  reopen();

  return board;
};