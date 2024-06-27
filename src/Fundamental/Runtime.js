import { ControllType } from "./Constant";

import * as RuntimeType from 'runtime';

const createArray = (sizes, curr, defaultValue) => {
    const ret = [];
    if(curr + 1 == sizes.length) {
        for(let i = 0; i < sizes[curr]; i++) {
            ret.push(defaultValue);
        }
        return ret;
    }
    for(let i = 0; i < sizes[curr]; i++) {
        ret.push(createArray(sizes, curr+1, defaultValue));
    }
    return ret;
}

class Runtime {
    /**
     * @param {AST} AST 
     */
    constructor(AST) {
        this.AST = AST;
        this.output = "";
        this.stack = {arr: []};
        this.symbolTable = new Map();
        this.stack = [];
        this.globalVariables = new Map();
    }

    setValue(exp1, exp2) {
        let varibleName = exp1.content;
        if(exp1.type === RuntimeType.postfix) {
            varibleName = varibleName.content;
            const varibaleRaw = this.symbolTable.get(varibleName);
            let variable = varibaleRaw;
            
            let postfix = exp1.sign;
            while(postfix.inner !== null) {
                const index = this.excute(postfix.parserIndex).result;
                variable = variable[index];
                postfix = postfix.inner;
            }
            const index = this.excute(postfix.parserIndex).result;
            variable[index] = exp2;
        } else {
            this.symbolTable.set(varibleName, exp2);
        }

    }

    binaryOp(exp1, exp2, sign) {
        switch(sign) {
            case '+':
                return exp1.result+exp2.result;
            case '-':
                return exp1.result-exp2.result;
            case '*':
                return exp1.result*exp2.result;
            case '/':
                return exp1.result/exp2.result;
            case '%':
                return exp1.result%exp2.result;
            case '<<':
                return exp1.result<<exp2.result;
            case '>>':
                return exp1.result>>exp2.result;
            case '^':
                return exp1.result^exp2.result;
            case '|':
                return exp1.result|exp2.result;
            case '||':
                return exp1.result||exp2.result;
            case '&&':
                return exp1.result&&exp2.result;
            case '&':
                return exp1.result&exp2.result;
            case '<':
                return exp1.result<exp2.result?1:0;
            case '>':
                return exp1.result>exp2.result?1:0;
            case '<=':
                return exp1.result<=exp2.result?1:0;
            case '>=':
                return exp1.result>=exp2.result?1:0;
            case '=':
                this.setValue(exp1.result, exp2.result);
                return exp2.result;
            case '==':
                return exp1.result==exp2.result?1:0;
        }
    }


    /**
     * @param {ForAST} currentNode 
     * @returns 
     */
    excuteFor(currentNode) {
        this.excute(currentNode.initial);
        let condition = this.excute(currentNode.condition);
        let currResult = null;
        let currState = {controllState: ControllType.normal};
        while(condition.result != 0) {
            const {state, result} = this.excute(currentNode.body);
            if(state.controllState == ControllType.returnState) {
                currResult = result;
            }
            if(state.controllState == ControllType.returnState || state.controllState == ControllType.breakState) {
                currState = state;
                break;
            }
            this.excute(currentNode.increment);
            condition = this.excute(currentNode.condition);
        }
        if(currState.controllState == ControllType.breakState || currState.controllState == ControllType.continueState) {
            currState.controllState = ControllType.normal;
        }
        return {result: currResult, state: currState};
    }

    /**
     * @param {VariableAST} currentNode 
     * @returns 
     */
    excuteVariable(currentNode) {
        let variable = this.globalVariables.get(currentNode.content);
        variable = this.symbolTable.get(currentNode.content);
        return {result: variable, state: {controllState: ControllType.normal}};
    }


    /**
     * @param {InvokeAST} node 
     * @returns 
     */
    excuteBuildin(node) {
        switch(node.functionName) {
            case '@output':
                for(const arg of node.argus) {
                    const {result} = this.excute(arg);
                    this.output += result;
                }
                break;
            case '@arguments':
                return {result: this.symbolTable.get('@arguments')}
            case '@outputWithFormat':
                {
                    const {result: argus} = this.excute(node.argus[0]);
                    const argument = argus;
                    let output = argument[0];
                    for(let i = 1; i < argument.length; i++) {
                        output = output.replace('%d', argument[i]);
                    }

                    this.output += output;
                }
                break;
            default:
                break;
        }
        return {result: null, state: {controllState: ControllType.normal}};
    }

    /**
     * @param {ProgramAST} currentNode 
     * @returns 
     */
    excuteProgram(currentNode) {
        for(const gvariables of currentNode.globals) {
            this.excute(gvariables);
        }

        this.globalVariables = this.symbolTable;
        this.structs = currentNode.structs;
        this.functionTable = currentNode.functions;
        const {state} = this.excute(currentNode.main);
        return {result : null, state};
    }

    /**
     * @param {BlockAST} currentNode 
     * @returns 
     */
    excuteBlock(currentNode) {
        this.stack.push("block");
        let currentState = {controllState: ControllType.normal};
        let currentResut = null;
        for(const child of currentNode.content) {
            const {result, state} = this.excute(child);
            if(state.controllState == ControllType.returnState) {
                currentResut = result;
            }
            if(state.controllState != ControllType.normal) {
                currentState = state;
                break;
            }
        }
        while(true) {
            const last = this.stack.pop();
            if(last == 'block')break;
            this.symbolTable.delete(last);
        }
        return {result : currentResut, state: currentState};
    }

    /**
     * @param {FunctionAST} currentNode 
     * @param {Object} argus 
     * @returns 
     */
    excuteFunction(currentNode, argus) {
        this.stack.push(currentNode.functionName);
        const paras = currentNode.parameters;
        const symbolTable = this.symbolTable;
        this.symbolTable = new Map();
        this.symbolTable.set(`@arguments`, argus);
        for(let i = 0; i < paras.length; i++) {
            const para = paras[i].variable.content;
            if(para === '...') {
                break;
            }
            this.stack.push(currentNode.functionName);
            this.symbolTable.set(para, argus[i]);
        }

        const {state, result} = this.excute(currentNode.body);

        while(true) {
            const last = this.stack.pop();
            if(last == currentNode.functionName)break;
            this.symbolTable.delete(last);
        }

        this.symbolTable = symbolTable;
        state.controllState = ControllType.normal;

        return {result, state};
    }

    /**
     * @param {ReturnAST} currentNode 
     * @returns 
     */
    excuteReturn(currentNode) {
        const {result} = this.excute(currentNode.content);
        return {result, state: {controllState: ControllType.returnState}};
    }

    /**
     * @param {InvokeAST} currentNode 
     * @returns 
     */
    excuteInvoke(currentNode) {
        const func = this.functionTable.get(currentNode.functionName);
        const argus = [];
        for(const argu of currentNode.argus) {
            const {result, state} = this.excute(argu);
            argus.push(result);
        }
        const {result, state} = this.excute(func, argus);
        return {result, state};
    }

    getType(type) {
        if(type.type == RuntimeType.arrayDeclearation) {
            const length = this.excute(type.parserIndex).result;
            const ret = [];
            for(let i = 0; i < length; i++) {
                ret.push(this.getType(type.inner));
            }
            return ret;
        } else if(type.type == RuntimeType.POD) {
            return 0;
        }
    }

    /**
     * @param {PostfixAST} currentNode 
     * @returns 
     */
    excuteArray(currentNode) {
        const varibleName = currentNode.content.content;
        let arr = currentNode.sign;
        const variable = this.symbolTable.get(varibleName);
        let value = variable;
        while(arr) {
            const index = this.excute(arr.parserIndex).result;
            value = value[index];
            arr = arr.inner;
        }
        return {result: value, state: {controllState: ControllType.normal}};
    }

    /**
     * @param {DeclearationAST} currentNode 
     * @returns 
     */
    excuteDeclearation(currentNode) {
        for(const assignment of currentNode.content) {
            const type = assignment[2];
            const variable = assignment[0].content;
            const defaultValue = this.getType(type);

            if(assignment[1]) {
                const exp = this.excute(assignment[1]);
                this.symbolTable.set(variable, exp.result);
            } else {
                this.symbolTable.set(variable, defaultValue);
            }

            this.stack.push(variable);
        }
        return {result: null, state: {controllState: ControllType.normal}};
    }

    /**
     * 
     * @param {Object} currentNode 
     * @param {Object | null} [argus=null]
     * @returns 
     */
    excute(currentNode, argus) {
        switch(currentNode.type) {
            case RuntimeType.program:
                return this.excuteProgram(currentNode);
            case RuntimeType.functionStmt:
                return this.excuteFunction(currentNode,argus);
            case RuntimeType.buildin:
                return this.excuteBuildin(currentNode);
            case RuntimeType.returnStmt:
                return this.excuteReturn(currentNode);
            case RuntimeType.string:
                return {result: currentNode.content, state: {controllState: ControllType.normal}};
            case RuntimeType.invoke:
                return this.excuteInvoke(currentNode);
            case RuntimeType.breakStmt:
                return {result : null, state: {controllState: ControllType.breakState}};
            case RuntimeType.continueStmt:
                return {result : null, state: {controllState: ControllType.continueState}};
            case RuntimeType.blocks:
                return this.excuteBlock(currentNode);
            case RuntimeType.arrayDeclearation:
                return this.excuteBlock(currentNode);
            case RuntimeType.array:
                return this.excuteArray(currentNode);
            case RuntimeType.binaryOp:
                {
                    const exp1 = this.excute(currentNode.content[0]);
                    const exp2 = this.excute(currentNode.content[1]);
                    const result = this.binaryOp(exp1, exp2, currentNode.sign);
                    return {result, state: {controllState: ControllType.normal}};
                }
            case RuntimeType.number:
                return {result: parseInt(currentNode.content), state: {controllState: ControllType.normal}};
            case RuntimeType.declearation:
                return this.excuteDeclearation(currentNode);
            case RuntimeType.variable:
                return this.excuteVariable(currentNode);

            case RuntimeType.lValue:
                return {result: currentNode.content, state: {controllState: ControllType.normal}};
            case RuntimeType.lValue:
                {
                    const {state, result: variable} = this.excute(currentNode.name);
                    let ele = variable;

                    for(const index of currentNode.arr) {
                        const {state, result} = this.excute(index);
                        ele = ele[result];
                    }

                    return {result: ele, state};
                }
            case RuntimeType.ifStmt:
                {
                    const condition = this.excute(currentNode.condition);
                    if(condition.result != 0) {
                        return this.excute(currentNode.body);
                    }
                    if(currentNode.elif)
                        for(const elif of currentNode.elif) {
                            const condition = this.excute(elif.condition);
                            if(condition.result != 0) {
                                return this.excute(elif.body);
                            }
                        }
                    
                    if(currentNode.elses) {
                        return this.excute(currentNode.elses);
                    }
                }
            case RuntimeType.whileStmt:
                {
                    let condition = this.excute(currentNode.condition);
                    let currState = {controllState: ControllType.normal};
                    let currResult = null;
                    while(condition.result != 0) {
                        const {state, result} = this.excute(currentNode.body);
                        currState = state;
                        if(state.controllState == ControllType.returnState) {
                            currResult = result;
                        }
                        if(state.controllState == ControllType.returnState || state.controllState == ControllType.breakState)break;
                        condition = this.excute(currentNode.condition);
                    }
                    if(currState.controllState == ControllType.breakState || currState.controllState == ControllType.continueState) {
                        currState.controllState = ControllType.normal;
                    }
                    return {result: currResult, state: currState};
                }
            case RuntimeType.forStmt:
                return this.excuteFor(currentNode);
            case RuntimeType.postfix: 
                {
                    if(currentNode.sign == '++') {
                        const content = this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result+1);
                        return {result: content.result, state: content.state};
                    } else if(currentNode.sign == '--') {
                        const content = this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result-1);
                        return {result: content.result, state: content.state};
                    } else {
                        return this.excuteArray(currentNode);
                    }
                }
            case RuntimeType.prefix: 
                {
                    if(currentNode.sign == '++') {
                        const content = this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result+1);
                        return {result: content.result, state: content.state};
                    }
                    if(currentNode.sign == '--') {
                        const content = this.excute(currentNode.content);
                        this.symbolTable.set(currentNode.content.content, content.result-1);
                        return {result: content.result, state: content.state};
                    }
                    if(currentNode.sign == '-') {
                        const content = this.excute(currentNode.content);
                        return {result: -content.result, state: content.state};
                    }
                    if(currentNode.sign == '+') {
                        const content = this.excute(currentNode.content);
                        return {result: content.result, state: content.state};
                    }
                }
            case RuntimeType.ternaryOp:
                {
                    if(currentNode.sign == '?') {
                        const condition = this.excute(currentNode.content[0]);
                        if(condition.result > 0) {
                            const content = this.excute(currentNode.content[1]);
                            return {result: content.result, state: content.state};
                        } else {
                            const content = this.excute(currentNode.content[2]);
                            return {result: content.result, state: content.state};
                        }
                    }
                }
            default:
                break;
        }
    }

    /**
     * 
     * @param {string} input 
     * @param {*} config 
     * @returns 
     */
    launch(input, config) {
        this.input = input;
        this.excute(this.AST);
        return {output: this.output.replaceAll('\\n', '\n')};
    }
}

export {
    Runtime
}