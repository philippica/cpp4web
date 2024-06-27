import { TokenType, keyWords, signs } from "./Constant";
import { cstdio } from "../Header/cstdio";

/**
 * Tokenizes a raw string of code.
 *
 * @param {string} str - The input string to tokenize.
 * @returns {{type: number, content: string, len: number}} An array containing the token information.
 *          Each token is represented as an object with a 'type' (e.g., 'char') and 'content' (e.g., 'a').
 */
const getNextToken = (str) => {

    const numberRex = /^((\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?[lLuU]*)|^(0[xX][0-9a-fA-F]+[lLuU]*)|^(0[0-7]+[lLuU]*)/
    if(str.startsWith(";")) {
        return {type: TokenType.semicolon, content: ";", len: 1};
    }

    if(str.startsWith('"')) {
        for(let i = 1; i < str.length; i++) {
            if(str[i] == '"' && str[i-1] != "\\") {
                let result = str.slice(1, i).replaceAll();
                return {type: TokenType.string, content: result, len: i+1};
            }
        }
    }

    if(str.startsWith("'")) {
        return {type: TokenType.char, content: str[1], len: 3};
    }
    if(str.startsWith("#")) {
        return {type: "preCompile", len: 1};
    }

    if(str.startsWith("/*")) {
        return {type: "comment", content: "/*", len: 2};
    }


    if(/^[\s]+/.test(str)) {
        const space = str.match(/^[\s]+/);
        return {type: "whiteSpace", content: space, len: space.length};
    }

    if(str.startsWith("//")) {
        return {type: "comment", content: "//", len: str.length};
    }

    if(numberRex.test(str)) {
        const number = str.match(numberRex)[0];
        return {type: TokenType.number, content: number, len: number.length};
    }

    if(/^[_a-zA-Z][_a-zA-Z0-9]*/.test(str)) {
        const identifier = str.match(/^[_a-zA-Z][_a-zA-Z0-9]*/)[0];
        if(keyWords.indexOf(identifier) !== -1) {
            return {type: TokenType.keyword, content: identifier, len: identifier.length};
        }
        return {type: TokenType.identifier, content: identifier, len: identifier.length};
    }

    if(/^\@[_a-zA-Z][_a-zA-Z0-9]*/.test(str)) {
        const identifier = str.match(/^\@[_a-zA-Z][_a-zA-Z0-9]*/)[0];
        return {type: TokenType.buildin, content: identifier, len: identifier.length};
    }

    for(const sign of signs) {
        if(str.startsWith(sign)) {
            return {type: TokenType.sign, content: sign, len: sign.length};
        }
    }
}

const getLine = (para) => {
    while(para.line !== '') {
        if(para.blockComment) {
            let i = 1;
            for(; i < para.line.length; i++) {
                if(para.line[i] == '/' && para.line[i-1] == '*') {
                    para.blockComment = false;
                    break;
                }
            }
            para.line = para.line.slice(i+1);
            if(para.line === '')break;
        }
        const tokenArr = getNextToken(para.line);
        if(tokenArr.type == 'preCompile') {
            return 1;
        }
        const token = tokenArr;
        if(token.type != "whiteSpace" && token.type != "comment") {
            token.line = para.lineNum;
            para.stream.push(token);
        } else if(token.content === '/*') {
            para.blockComment = true;
        }
        para.line = para.line.slice(tokenArr.len);
    }
    return 0;
}

const preCompile = (stream, stream2) => {
    let index = 0;
    switch(stream[index].content) {
        case "include":
            index++;
            if(stream[index].content == '<')index++;
            const para = {
                lineNum: 1,
                blockComment: false,
                stream: stream2
            };
            const headerList = {
                "cstdio": cstdio,
                "stdio": cstdio
            };
            const header = headerList[stream[index].content];
            const lines = header.split('\n');

            for(const line of lines) {
                para.line = line;
                getLine(para);
            }

            return;
        
        case "define":
            index++;
            return;
        
    }
}

const Tokenizer = (rawCode) => {
    const lines = rawCode.split('\n');
    const para = {
        lineNum: 1,
        blockComment: false,
        stream: []
    };
    for(const lineRow of lines) {
        para.line = lineRow;
        const isPreCompile = getLine(para);
        if(isPreCompile) {
            const stream = para.stream;
            para.stream = [];
            para.line = para.line.slice(1);
            getLine(para);
            preCompile(para.stream, stream);

            para.stream = stream;
        }
        para.lineNum++;
    }
    return para.stream;
}

export {
    Tokenizer
}