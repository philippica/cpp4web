import { TokenType } from "./Constant";
/**
 * Represents a parser for some stream data.
 * @class
 * 
 */
class Parser {

    #stream

    /**
     * Creates a new Parser instance.
     * @param {TokenStream} stream - The input stream.
     * @param {number} [parserIndex=0] - The initial index.
     */
    constructor(stream, parserIndex) {
        this.#stream = stream;
        this.parserIndex = parserIndex ?? 0;
        this.error = [];
        this.structOrUnion = {};
        this.ast = {};
        this.meta = {attemptErrorMessage: []};
        this.variables = new Map();
        this.stack = [];
        this.functions = new Map();
        this.structs = new Map();
    }

    /**
     * Executes a parser function and updates the state.
     * @param {ParserFunction} parserFunction - The parser function to execute.
     * @returns {Parser} - The updated parser instance.
     */
    thenParse(parserFunction) {
        if(this.error.length === 0) {
            const ret = parserFunction(this);
            if(this.error.length === 0) {
                this.ast = ret.ast;
                this.parserIndex = ret.parserIndex;
            }
        }
        return this;
    }

    /**
     * Attempts to execute a parser function without raising an error.
     * @param {ParserFunction} parserFunction - The parser function to attempt.
     * @returns {boolean} - `true` if successful, `false` otherwise.
     */
    attempt(parserFunction) {
        if(this.error.length === 0) {
            const parser = this.copy();
            
            const ret = parserFunction(parser);
            if(ret.error.length === 0) {
                this.ast = ret.ast;
                this.parserIndex = ret.parserIndex;
                return true;
            }
            this.meta.attemptErrorMessage = this.meta.attemptErrorMessage.concat(ret.error);
        }
        return false;
    }

    /**
     * @param {mAST} ast 
     * @returns {Parser}
     */
    setAST(ast) {
        this.ast = ast;
        if(ast && !ast.lineNum)ast.lineNum = this.currentLine;
        return this;
    }

    /**
     * @param {Object} obj 
     * @returns {Parser}
     */
    getAST(obj) {
        obj.ast = this.ast;
        return this;
    }

    /**
     * @param {string} error 
     * @returns {Parser}
     */
    setError(error) {
        this.ast = {};
        error += ` at line ${this.currentLine + 1}`;
        this.error.push(error);
        return this;
    }


    copy() {
        const parser = new Parser(this.#stream, this.parserIndex);
        parser.variables = this.variables;
        parser.functions = this.functions;
        parser.structs = this.structs;
        parser.stack = this.stack;
        return parser;
    }

    /**
     * Executes a sequence and updates the state.
     * @param {ParserFunction} parserFunction - The parser function to execute.
     * @returns {Parser} - The updated parser instance.
     */
    sequence(parserFunction) {
        const ast = [];
        while(!this.empty()) {
            const result = this.attempt((parser) => {
                return parserFunction(parser);
            });

            if(result) {
                ast.push(this.ast);
            } else {
                break;
            }
        }
        this.ast = ast;
        return this;
    }

    /**
     * 
     * @param {ParserFunction} parserFunction
     * @param {Object} initial
     * @returns {Parser} - The updated parser instance.
     */
    reduce(parserFunction, initial) {
        let last = initial;
        while(true) {
            const result = this.attempt((parser) => {
                parser.meta.last = last;
                return parserFunction(parser);
            });

            if(result) {
                last = this.ast;
            } else {
                break;
            }
        }
        this.ast = last;
        return this;
    }


    /**
     * @param {Array<[null|Array<string>| Function, ParserFunction, Function] | [null|Array<string>| Function, ParserFunction]>} parserFunctions 
     * @returns {Parser}
     */
    choose(parserFunctions) {
        if(this.error.length)return this;
        const errors = [];
        for(const parserFunction of parserFunctions) {
            const foresees = parserFunction[0];
            const parserFunc = parserFunction[1];
            const afterFunc = parserFunction[2];
            if (typeof(foresees) == 'function') {
                if(!foresees(this))continue;
                    const result = this.attempt((parser) => {
                    return parserFunc(parser);
                });

                if(result) {
                    if(afterFunc) afterFunc(this);
                    return this;
                }
            } else if(foresees) {
                for(const foresee of foresees) {
                    if(this.currentToken.content === foresee && (this.currentToken.type === TokenType.sign || this.currentToken.type === TokenType.keyword)) {
                        const result = parserFunc(this);
                        if(afterFunc) afterFunc(this);
                        return result;
                    }
                }
            } else {
                const result = this.attempt((parser) => {
                    return parserFunc(parser);
                });

                if(result) {
                    if(afterFunc) afterFunc(this);
                    return this;
                }
            }
        }
        this.error = this.error.concat(this.meta.attemptErrorMessage);
        if(this.error.length === 0) {
            this.error.push("stop");
        }
        return this;
    }


    /**
     * Parses a single token of the specified type.
     * @param {number} type - The token type.
     * @param {Array} contents - The expected token contents.
     * @param {boolean} [jump=false] - Whether to advance the parserIndex.
     * @returns {Parser} - The updated parser instance.
     */
    parseSingle = (type, contents, jump=false) => {
        if (this.error.length)return this;
        if(this.checkToken(type, contents)) {
            if(!jump){
                this.ast = {
                    content: this.currentToken.content,
                    type
                };
            }
            this.parserIndex++;
        } else this.setError(`cannot find ${contents[0]}`);
        return this;
    }

    /**
     * @param {Array<string>} keywords - The expected token contents.
     * @returns {Parser} - The updated parser instance.
     */
    jumpSign = (keywords) => this.parseSingle(TokenType.sign, keywords, true);

    /**
     * @param {Array<string>} keywords - The expected token contents.
     * @returns {Parser} - The updated parser instance.
     */
    parseSign = (keywords) => this.parseSingle(TokenType.sign, keywords);
    
    /**
     * @returns {Parser} - The updated parser instance.
     */
    parseSemicolon = () => this.parseSingle(TokenType.semicolon, []);
    
    /**
     * @returns {Parser} - The updated parser instance.
     */
    jumpSemicolon = () => this.parseSingle(TokenType.semicolon, [], true);

    /**
     * @param {Array<string>} keywords - The expected token contents.
     * @returns {Parser} - The updated parser instance.
     */
    parseKeywords = (keywords) => this.parseSingle(TokenType.keyword, keywords);

    /**
     * @returns {Parser} - The updated parser instance.
     */
    parseNumber = () => this.parseSingle(TokenType.number, []);

    /**
     * @param {Array<string>} identify - The expected token contents.
     * @returns {Parser} - The updated parser instance.
     */
    parseIdentify = (identify) => this.parseSingle(TokenType.identifier, identify);

    get currentToken() {
        return this.#stream[this.parserIndex];
    }

    getStructOrUnion(name) {
        return this.structOrUnion[name];
    }

    checkToken(type, contents) {
        if(this.error.length) return false;
        const token = this.currentToken;
        if(token.type === type && (contents.length === 0 || contents.indexOf(token.content) !== -1)) {
            return true;
        }
        return false;
    }

    checkSign = (signs) => this.checkToken(TokenType.sign, signs);

    get currentLine() {
        if(this.parserIndex >= this.#stream.length)return -1;
        return this.#stream[this.parserIndex].line;
    }

    /**
     * @returns {Boolean}
     */
    empty() {
        return this.parserIndex >= this.#stream.length;
    }

}


export {
    Parser,
};