import { TokenType, signs, keyWords } from "./Constant";


import { Parser } from "./Parser";



import * as RuntimeType from 'runtime';

/**
 * @returns {{ast: any}}
 */
function emptyAST () {
    return {ast: {type: RuntimeType.empty}};
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseVariable = (parser) => {
    const exp = parser.parseIdentify([]).ast;
    const type = parser.variables.get(exp?.content);
    if(!type) {
        parser.error = `${exp?.content} is not a varibale`;
        return parser;
    }
    return parser.setAST({
        type: RuntimeType.variable,
        T: type,
        content: exp.content
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseNumber = (parser) => {
    const exp = parser.parseNumber().ast;
    parser.setAST({
        type: RuntimeType.number,
        content: exp.content,
    });
    return parser;
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseLValue = (parser) => {
    let exp = emptyAST();
    return parser.thenParse(parsePostfixExpression)
                 .getAST(exp)
                 .setAST({
                    type: RuntimeType.lValue,
                    content: exp.ast,
                 });
}

/**
 * @param {Array<string>} signs 
 * @param {ParserFunction} nextParserFunction 
 * @returns {ParserFunction}
 */
const parseBinaryOperations = (signs, nextParserFunction) => (parser) => {
    const exp1 = parser.thenParse(nextParserFunction).ast;
    return parser.reduce((_parser)=>{
        const signWrapper = {}, exp2Wrapper = {};
        return _parser.parseSign(signs).getAST(signWrapper)
               .thenParse(nextParserFunction).getAST(exp2Wrapper)
               .setAST({
                    type: RuntimeType.binaryOp,
                    sign: signWrapper.ast.content,
                    content: [_parser.meta.last, exp2Wrapper.ast],
                });
    }, exp1);
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseBool = (parser) => {

    const value = parser.parseKeywords(['true', 'false']).ast.content;
    return parser.setAST({
        type: RuntimeType.number,
        content: value === 'true' ? '1':'0',
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseString = (parser) => {
    const value = parser.parseSingle(TokenType.string, []).ast.content;
    return parser.setAST({
        type: RuntimeType.string,
        content: value,
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseChar = (parser) => {
    const value = parser.parseSingle(TokenType.char, []).ast.content;
    return parser.setAST({
        type: RuntimeType.string,
        content: value,
    });
}


/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseInvoke = (parser) => {
    const functionNameObj = {};
    parser.choose([
        [null, (_parser) => _parser.parseIdentify([])],
        [null, (_parser) => _parser.parseSingle(TokenType.buildin ,[])],
    ]).getAST(functionNameObj);

    const functionName = functionNameObj.ast?.content;
    const tokenType = functionNameObj.ast?.type;
    const func = parser.functions.get(functionName);
    if(!func && tokenType === RuntimeType.invoke) {
        parser.error = `${functionName} is not a function`;
        return parser;
    }

    const argus = parser.jumpSign(['(']).sequence((_parser)=>{
        _parser.thenParse(parseAssignment);
        if(!_parser.checkSign([')']))_parser.jumpSign([',']);
        return _parser
    }).jumpSign([')']).ast;
    parser.setAST({
        type: tokenType === TokenType.buildin ? RuntimeType.buildin:RuntimeType.invoke,
        functionName,
        argus,
    });
    return parser;
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parsePrimaryExpression = (parser) => {
    return parser.choose([
        [['('], (_parser) => _parser.jumpSign(['(']).thenParse(expression).jumpSign([')'])],
        [['true', 'false'], parseBool],
        [null, parseNumber],
        [null, parseVariable],
        [null, parseInvoke],
        [null, parseString],
        [null, parseChar],
    ]);
}

/**
 * @param {Object} innerType 
 * @returns {ParserFunction}
 */
const parseArrayDeclearation2 = (innerType) => (parser) => {

    const index = emptyAST();
    const inner = emptyAST();
    return parser.choose([
        [['['], (_parser) => _parser.jumpSign(['['])
                                   .thenParse(expression).getAST(index)
                                   .jumpSign([']'])
                                   .thenParse(parseArrayDeclearation2(innerType)).getAST(inner)
                                   .setAST({
                                     type: RuntimeType.arrayDeclearation,
                                     inner: inner.ast,
                                     parserIndex: index.ast
                                   })
        ],
        [null, (_parser) => _parser.setAST(innerType)],
    ]);
}

/**
 * @param {Object} innerType 
 * @returns {ParserFunction}
 */
const parseArray2 = (innerType) => (parser) => {

    const index = emptyAST();
    const inner = emptyAST();
    return parser.choose([
        [['['], (_parser) => _parser.thenParse((_parser)=>{
                                        if(innerType.type !== RuntimeType.arrayDeclearation)return _parser.setError("type error");
                                        return _parser;
                                    })
                                    .jumpSign(['['])
                                    .thenParse(expression).getAST(index)
                                    .jumpSign([']'])
                                    .thenParse(parseArray2(innerType)).getAST(inner)
                                    .setAST({
                                      type: RuntimeType.array,
                                      inner: inner.ast,
                                      parserIndex: index.ast
                                    })
        ],
        [['.'], (_parser) => _parser.thenParse((_parser)=>{return _parser;})
                                    .jumpSign(['['])
                                    .thenParse(expression).getAST(index)
                                    .jumpSign([']'])
                                    .thenParse(parseArray2(innerType)).getAST(inner)
                                    .setAST({
                                      type: RuntimeType.array,
                                      inner: inner.ast,
                                      parserIndex: index.ast
                                    })
        ],
        // @ts-ignore
        [null, (_parser) => _parser.setAST(null)],
    ]);
}


/**
 * @param {Object} type 
 * @param {Object} variable 
 * @returns {ParserFunction}
 */
const parsePostfix = (type, variable) => (parser) => {
    if(type.type === RuntimeType.arrayDeclearation) {
        const primaryObj = emptyAST();
        parser.thenParse(parseArray2(type)).getAST(primaryObj).setAST({
            type: RuntimeType.postfix,
            sign: primaryObj.ast,
            content: variable
        });
    } else if(type.type === 'struct') {
        console.info(type);
    } else
        parser.setAST(variable);
    return parser;
}


/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parsePostfixExpression = (parser) => {


    const primaryObj = emptyAST();
    return parser.thenParse(parsePrimaryExpression)
                 .getAST(primaryObj)
                 .thenParse((_parser) => {
                     let primaryExp = primaryObj.ast;
                     if(primaryExp.type === RuntimeType.variable) {
                         const type = primaryExp.T;
                         parser.thenParse(parsePostfix(type, primaryExp)).getAST(primaryExp);
                     }

                     if(parser.attempt((_parser) =>  _parser.parseSign(['++', '--']))) {
                         parser.setAST({
                             type: RuntimeType.postfix,
                             sign: parser.ast.content,
                             content: primaryExp.ast,
                         });
                     }
                     return _parser;
                 });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parsePrefixExpression = (parser) => {
    const unarySigns = ["++", "--", "+", "-", "~", "!", "*", "&"];
    const sign = emptyAST(), exp = emptyAST();
    return parser.choose([
        [unarySigns, (_parser) => _parser.parseSign(unarySigns).getAST(sign).thenParse(parsePrefixExpression).getAST(exp)
                                         .setAST({
                                            type: RuntimeType.prefix, 
                                            sign: sign.ast.content, 
                                            content: exp.ast
                                        })],
        [null, parsePostfixExpression]     
    ]);

}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseMultiplicative = (parser) => parser.thenParse(parseBinaryOperations(["*", "/", "%"], parsePrefixExpression));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseAdditive = (parser) => parser.thenParse(parseBinaryOperations(["+", "-"], parseMultiplicative));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseShift = (parser) => parser.thenParse(parseBinaryOperations(["<<", ">>"], parseAdditive));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseRelational = (parser) => parser.thenParse(parseBinaryOperations(["<", ">", "<=", ">="], parseShift));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseEuality = (parser) => parser.thenParse(parseBinaryOperations(['==', '!='], parseRelational));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseAnd = (parser) => parser.thenParse(parseBinaryOperations(['&'], parseEuality));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseXor = (parser) => parser.thenParse(parseBinaryOperations(['^'], parseAnd));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseOr = (parser) => parser.thenParse(parseBinaryOperations(['|'], parseXor));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseLogicalAnd = (parser) => parser.thenParse(parseBinaryOperations(['&&'], parseOr));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseLogicalOr = (parser) => parser.thenParse(parseBinaryOperations(['||'], parseLogicalAnd));

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseConditionalExpression = (parser) => {
    const condition = parser.thenParse(parseLogicalOr).ast;
    // @ts-ignore
    const result = parser.attempt((_parser) => {
        const exp1 = _parser.jumpSign(['?']).thenParse(expression).jumpSign([':']).ast;
        const exp2 = _parser.thenParse(expression).ast;
        return _parser.setAST({
            type: RuntimeType.ternaryOp,
            sign: "?",
            content: [condition, exp1, exp2]
        });
    });
    return parser;
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseAssignment = (parser) => {
    const seq = parser.sequence((_parser)=>{
        const lvalueWrapper = {}, signWrapper = {};
        return _parser.thenParse(parseLValue).getAST(lvalueWrapper)
               .parseSign(signs.slice(1, 13)).getAST(signWrapper)
               .setAST({
                    type: RuntimeType.binaryOp,
                    sign: signWrapper.ast.content,
                    content: [lvalueWrapper.ast],
                });
    }).ast;

    const value = parser.thenParse(parseConditionalExpression).ast;
    if(seq.length) {
        for(let i = 0; i < seq.length-1; i++) {
            seq[i].content.push(seq[i+1]);
        }
        seq[seq.length-1].content.push(value);
        parser.setAST(seq[0]);
    }
    return parser;
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const expression = (parser) => {

    let assignmentAst = parser.thenParse(parseAssignment).ast;
    while(parser.checkSign([','])) {
        parser.parseSign([',']);
        assignmentAst = {
            type: RuntimeType.binaryOp,
            sign: ',',
            content: [assignmentAst, parser.thenParse(parseAssignment).ast],
        };
    }
    // @ts-ignore
    parser.setAST(assignmentAst);
    return parser;
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const expressionStatement = (parser) => parser.thenParse(expression).jumpSemicolon();

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseStructType = (parser) => {
    if(!parser.getStructOrUnion(parser.currentToken.content)) {
        return parser.setError("not struct");
    }
    return parser.parseIdentify([]).setAST({
        type: RuntimeType.type,
        T: {
            type: RuntimeType.struct,
            name: parser.currentToken.content,
        }
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseType = (parser) => {
    const PODs = keyWords.slice(0,11);
    const type = {};
    return parser.choose([
        [PODs, (_parser)=> _parser.parseKeywords(PODs).getAST(type).setAST( {type: RuntimeType.type, T: {type: RuntimeType.POD, name: type.ast}} )],
        [null, parseStructType]
    ]);
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseDeclearation = (parser) => {
    const typeObj = emptyAST();
    const type = parser.thenParse(parseType).ast?.T;
    const seqObj = emptyAST();
    return parser.sequence((_parser) => {
        let variable = _parser.parseIdentify([]).ast;
        const currentType = _parser.thenParse(parseArrayDeclearation2(type)).ast;
        let value = null;
        if(_parser.checkSign(['=']))value = _parser.jumpSign(['=']).thenParse(parseConditionalExpression).ast;
        if(_parser.checkSign([',']))_parser.jumpSign([',']);
        // @ts-ignore
        _parser.setAST([variable, value, currentType]);
        return _parser;
    }).getAST(seqObj)
    .thenParse((_parser) => {
        if(_parser.checkSign(['('])) {
            return _parser.setError("not variable");
        }
        const seq = seqObj.ast;
    
        seq.forEach(element => {
            parser.variables.set(element[0].content, element[2]);
            parser.stack.push(element[0].content);
        });
        return _parser;
    }).setAST({
        type: RuntimeType.declearation,
        content: seqObj.ast
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseFor = (parser) => {
    const initial = {};
    const condition = {};
    const increment = {};
    const body = {};
    const lineNum = parser.currentToken.line;
    return parser.parseKeywords(['for'])
          .jumpSign(['('])
          .choose([
            [null, expressionStatement],
            [null, parseDeclearation]
          ]).jumpSemicolon().getAST(initial)
          .thenParse(expression).jumpSemicolon().getAST(condition)
          .thenParse(expression).getAST(increment)
          .jumpSign([')'])
          .choose([
            [null, parseBlock],
            [null, singleStatement]
          ]).getAST(body)
          .setAST({
            type: RuntimeType.forStmt,
            initial: initial.ast,
            condition: condition.ast,
            increment: increment.ast,
            body:body.ast,
            lineNum
          });

}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseWhile = (parser) => {
    const condition = {};
    const body = {};
    const lineNum = parser.currentToken.line;
    return parser.parseKeywords(['while'])
          .jumpSign(['('])
          .thenParse(expression).getAST(condition)
          .jumpSign([')'])
          .choose([
            [['{'], parseBlock],
            [null, singleStatement]
          ]).getAST(body)
          .setAST({
            type: RuntimeType.whileStmt,
            condition: condition.ast,
            body:body.ast,
            lineNum
          });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseDoWhile = (parser) => {
    const condition = emptyAST();;
    const body = emptyAST();;
    return parser.parseKeywords(['do'])
          .thenParse(parseBlock).getAST(body)
          .parseKeywords(["while"]).jumpSign(['('])
          .thenParse(expression).getAST(condition)
          .setAST({
            type: RuntimeType.doStmt,
            condition: condition.ast,
            body:body.ast,
          });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseIf = (parser) => {
    const condition = {};
    const body = {};
    const elif = {};
    const elses = {};
    const lineNum = parser.currentToken.line;
    return parser.parseKeywords(['if'])
                 .jumpSign(['(']).thenParse(expression).jumpSign([')']).getAST(condition)
                 .choose([
                    [['{'], parseBlock],
                    [null, singleStatement]
                  ]).getAST(body)
                 .sequence((_parser) => {
                    const condition = {};
                    const body = {};
                    return _parser.parseKeywords(['else']).parseKeywords(['if']).jumpSign(['('])
                           .thenParse(expression).getAST(condition)
                           .jumpSign([')'])
                           .thenParse(parseBlock).getAST(body)
                           // @ts-ignore
                           .setAST({
                              condition: condition.ast,
                              body: body.ast
                           });
                 }).getAST(elif)
                 .sequence((_parser) => _parser.parseKeywords(['else']).choose([
                    [['{'], parseBlock],
                    [null, singleStatement]
                  ])).getAST(elses)
                 .setAST({
                    type: RuntimeType.ifStmt,
                    condition: condition.ast,
                    body: body.ast,
                    elif: elif.ast,
                    elses: elses.ast[0],
                    lineNum
                 });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseBreak = (parser) => parser.parseKeywords(['break']).setAST({type: RuntimeType.breakStmt}).jumpSemicolon();

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseContinue = (parser) => parser.parseKeywords(['continue']).setAST({type: RuntimeType.continueStmt}).jumpSemicolon();


/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseReturn = (parser) => {
    const exp = emptyAST();;
    return parser.parseKeywords(['return'])
                 .thenParse(expression).getAST(exp)
                 .setAST({
                    type: RuntimeType.returnStmt,
                    content: exp.ast,
                 })
                 .jumpSemicolon();
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const singleStatement = (parser) => parser.choose([
    [['for'], parseFor],
    [['while'], parseWhile],
    [['do'], parseDoWhile],
    [['if'], parseIf],
    [['break'], parseBreak],
    [['continue'], parseContinue],
    [['return'], parseReturn],
    [null, expressionStatement ],
    [null, (_parser) => parseDeclearation(_parser).jumpSemicolon()],
])

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseBlock = (parser) => {
    parser.stack.push('{');
    const lineNum = parser.currentToken.line;
    const seq = parser.jumpSign(['{']).sequence(singleStatement).jumpSign(['}']).ast;
    seq.lineNum = lineNum;

    while(parser.stack[parser.stack.length-1] != '{') {
        parser.variables.delete(parser.stack[parser.stack.length-1]);
        parser.stack.pop();
    }
    parser.stack.pop();
    return parser.setAST({
        type: RuntimeType.blocks,
        content:seq
    });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseFunction = (parser) => {
    const returnType = {ast: {type: RuntimeType.empty}};
    const functioinNameObj = {ast: {type: RuntimeType.empty}};
    const blockObj = {ast: {type: RuntimeType.empty}};
    const parameters = {ast:{type: RuntimeType.empty}};
    let functionName = "";
    return parser.thenParse(parseType).getAST(returnType)
          .parseIdentify([]).getAST(functioinNameObj)
          .thenParse((_parser) => {
            const fn = functioinNameObj.ast;
            functionName = fn.content;
            parser.functions.set(functionName, {});
            return _parser;
          })
          .jumpSign(['(']).sequence((_parser) => {
             if(_parser.checkSign([')'])) {
                 return _parser.setError("end");
             }
             const type = _parser.thenParse(parseType).ast?.T;
             const variable = _parser.parseIdentify([]).ast;
            
             parser.variables.set(variable.content, type);
             parser.stack.push(variable.content);
             _parser.ast = {type, variable};
             if(!_parser.checkSign([')'])) {
                 _parser.jumpSign([',']);
             }
             return _parser;
          }).jumpSign([')']).getAST(parameters)
          .thenParse(parseBlock).getAST(blockObj)
          .thenParse((_parser) => {
            _parser.functions.set(functionName, parser.ast);
            return _parser
          }).setAST({
              type: RuntimeType.functionStmt,
              functionName,
              returnType: returnType.ast,
              parameters: parameters.ast,
              body: blockObj.ast
          });
}

/**
 * @param {Parser} parser 
 * @returns {Parser}
 */
const parseProgram = (parser) => {
    const globals = [];
    const functions = new Map();
    return parser.sequence((_) => _.choose([
            [null, (_parser) => parseDeclearation(_parser).jumpSemicolon(), (_parser)=> {globals.push(_parser.ast);} ],
            [null, parseFunction, (_parser)=> {functions.set(_parser.ast.functionName, _parser.ast);} ],
        ])
    ).thenParse((_parser) => {
        if(!_parser.empty()) {
            _parser.setError(_parser.meta.attemptErrorMessage);
        }
        return _parser
    }).setAST({
        type: RuntimeType.program,
        globals: globals,
        functions: functions,
        main: parser.functions.get('main'),
        structs: null
    });
}

/**
 * @param {TokenStream} stream 
 * @returns {Object}
 */
const Parse = (stream) => {
    const parser = new Parser(stream);

    const result = parseProgram(parser).ast;
    if(parser.error) {
        throw parser.error;
    }
    return result;
}


export {
    Parse
};



