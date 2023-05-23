type Dictionary<T> = {[key:string]: T};
type Collection<T> = Dictionary<T> | Array<T>;

const MAX_INT = 2 ** 32;

// Decent pseudo random number generator based on:
// https://en.wikipedia.org/wiki/Xorshift
// Values seem fairly evenly distributed on [0, 1)
function nextSeed(seed: number) {
    let x = Math.floor(MAX_INT * seed);
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x / MAX_INT) + 0.5;
}

function numberToSeed(number: number) {
    return nextSeed((Math.cos(number) + 1 ) / 2);
}

// Seeded random number generator.
class SRandom {
    _seed: number;

    constructor(seed: number) {
        this._seed = seed;
    }

    // Return an instance of SRandom with a seed based on the given value.
    seed(value: number): SRandom {
        return new SRandom(numberToSeed(value));
    }

    // Create a new seed based on the current seed and a given value.
    addSeed(value: number): SRandom {
        return this.seed(this._seed + value);
    }

    nextSeed(): SRandom {
        return new SRandom(nextSeed(this._seed));
    }

    random(): number {
        return nextSeed(this._seed);
    }

    // This generates a random number and advances *this* geneator to the next seed.
    generateAndMutate(): number {
        this._seed = nextSeed(this._seed);
        return this._seed;
    }

    /**
     * @param {number} min  The smallest returned value
     * @param {number} max  The largest returned value
     */
    range(A:number, B:number): number {
        var min = Math.min(A, B);
        var max = Math.max(A, B);
        return Math.floor(this.random() * (max + 1 - min)) + min;
    }

    /**
     * @param {Collection} collection  The collection of elements to return random element from
     */
    element<T>(collection: Collection<T>): T {
        if (collection.constructor == Object) {
            const object = collection as Dictionary<T>;
            const keys = Object.keys(object);
            const key = this.element(keys);
            return object[key];
        }
        if (collection.constructor == Array) {
            const array = collection as Array<any>;
            return array[Math.floor(this.random() * array.length)];
        }
        throw new Error("Warning @ Random.element: "+ collection + " is neither Array or Object");
    }

    /**
     * @param {Array} array  The array of elements to return random element from
     */
    removeElement<T>(collection: Collection<T>): T {
        if (collection.constructor == Object) {
            const object = collection as Dictionary<T>;
            const keys = Object.keys(object);
            const key = this.element(keys);
            const value = object[key];
            delete object[key];
            return value;
        }
        if (collection.constructor == Array) {
            const array = collection as Array<T>;
            return array.splice(Math.floor(this.random() * array.length), 1)[0];
        }
        throw new Error("Warning @ Random.removeElement: "+ collection + " is neither Array or Object");
    }

    /**
     * Shuffles an array.
     *
     * Knuth algorithm found at:
     * http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
     *
     * @param {Array} array  The array of elements to shuffle
     */
    shuffle<T>(array:T[]):T[] {
        let randomizer: SRandom = this;
        array = [...array];
        let currentIndex = array.length, temporaryValue: T, randomIndex: number;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(randomizer.random() * currentIndex);
          randomizer = randomizer.nextSeed();
          currentIndex -= 1;
          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }
        return array;
    }
};
const instance = new SRandom(0.5);
// @ts-ignore
window['SRandom'] = instance;
export default instance;
