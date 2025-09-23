# Cpp4Web - JavaScript Interpreter for C++

Cpp4Web is a JavaScript library that serves as an interpreter for C++. It allows you to tokenize C++ code, parse it into an Abstract Syntax Tree (AST), and run the code to produce an output.

Here is a demo: https://philippica.github.io/cpp4web/

Warning: This is an experimental project for educational purposes only, and it implements only a very limited subset of C++ features.

## Usage

1. To tokenize C++ code to tokens:

```javascript
const stream = Cpp4Web.Tokenizer(code);
```

`stream` will be an array of tokens.

2. To parse the tokens to AST:

```javascript
const AST = Cpp4Web.Parse(stream);
```

3. To create a runtime for the AST:

```javascript
const runtime = new Cpp4Web.Runtime(AST);
```

4. To run the C++ code and output an object:

```javascript
const {output} = runtime.launch();
```

## Installation

To install Cpp4Web, run the following commands:

```bash
npm install
npm run build
```

The library will be bundled in the `dist` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by philippica

Feel free to contribute by submitting a pull request or opening an issue on GitHub. Thank you for using Cpp4Web!
