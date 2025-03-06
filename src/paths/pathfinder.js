
export default class Pathfinder {

    findPath(from, to, path = []){
        if (from.x === to.x && from.y === to.y){
            return path;
        }
        path = this.findPath({
            x: from.x,
            y: from.y + 1

        }, to, path.concat([{x: 0, y: 1}]))
        return path;
    }

    testMe(){
        return true;
    };
}
