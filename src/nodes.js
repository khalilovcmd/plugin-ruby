const {
  concat,
  dedent,
  group,
  hardline,
  indent,
  join,
  line,
  literalline,
  markAsRoot,
  softline,
  trim
} = require("./builders");

const toProc = require("./toProc");
const { concatBody, empty, first, literal, prefix } = require("./utils");

const nodes = {
  "@int": (path, _opts, _print) => {
    const { body } = path.getValue();

    // If the number is octal and does not contain the optional "o" character
    // after the leading 0, add it in.
    if (/^0[0-9]/.test(body)) {
      return `0o${body.slice(1)}`;
    }

    // If the number is a decimal number, is sufficiently large, and is not
    // already formatted with underscores, then add them in in between the
    // numbers every three characters starting from the right.
    if (!body.startsWith("0") && body.length >= 4 && !body.includes("_")) {
      return `  ${body}`
        .slice((body.length + 2) % 3)
        .match(/.{3}/g)
        .join("_")
        .trim();
    }

    return body;
  },
  "@__end__": (path, _opts, _print) => {
    const { body } = path.getValue();
    return concat([trim, "__END__", literalline, body]);
  },
  binary: (path, opts, print) => {
    const operator = path.getValue().body[1];
    const useNoSpace = operator === "**";

    return group(
      concat([
        concat([path.call(print, "body", 0), useNoSpace ? "" : " "]),
        operator,
        indent(
          concat([useNoSpace ? softline : line, path.call(print, "body", 2)])
        )
      ])
    );
  },
  bodystmt: (path, opts, print) => {
    const [_statements, rescue, elseClause, ensure] = path.getValue().body;
    const parts = [path.call(print, "body", 0)];

    if (rescue) {
      parts.push(dedent(concat([hardline, path.call(print, "body", 1)])));
    }

    if (elseClause) {
      // Before Ruby 2.6, this piece of bodystmt was an explicit "else" node
      const stmts =
        elseClause.type === "else"
          ? path.call(print, "body", 2, "body", 0)
          : path.call(print, "body", 2);

      parts.push(concat([dedent(concat([hardline, "else"])), hardline, stmts]));
    }

    if (ensure) {
      parts.push(dedent(concat([hardline, path.call(print, "body", 3)])));
    }

    return group(concat(parts));
  },
  break: (path, opts, print) => {
    const content = path.getValue().body[0];

    if (content.body.length === 0) {
      return "break";
    }

    if (content.body[0].body[0].type === "paren") {
      return concat([
        "break ",
        path.call(print, "body", 0, "body", 0, "body", 0, "body", 0)
      ]);
    }

    return concat(["break ", join(", ", path.call(print, "body", 0))]);
  },
  defined: (path, opts, print) =>
    group(
      concat([
        "defined?(",
        indent(concat([softline, path.call(print, "body", 0)])),
        concat([softline, ")"])
      ])
    ),
  dot2: (path, opts, print) =>
    concat([
      path.call(print, "body", 0),
      "..",
      path.getValue().body[1] ? path.call(print, "body", 1) : ""
    ]),
  dot3: (path, opts, print) =>
    concat([
      path.call(print, "body", 0),
      "...",
      path.getValue().body[1] ? path.call(print, "body", 1) : ""
    ]),
  dyna_symbol: (path, opts, print) => {
    const { quote } = path.getValue().body[0];

    return concat([":", quote, concat(path.call(print, "body", 0)), quote]);
  },
  embdoc: (path, _opts, _print) => concat([trim, path.getValue().body]),
  excessed_comma: empty,
  fcall: concatBody,
  method_add_arg: (path, opts, print) => {
    const [method, args] = path.map(print, "body");
    const argNode = path.getValue().body[1];

    // This case will ONLY be hit if we can successfully turn the block into a
    // to_proc call. In that case, we just explicitly add the parens around it.
    if (argNode.type === "args" && args.length > 0) {
      return concat([method, "("].concat(args).concat(")"));
    }

    return concat([method, args]);
  },
  method_add_block: (path, opts, print) => {
    const [method, block] = path.getValue().body;
    const proc = toProc(block);

    if (proc && method.type === "call") {
      return group(
        concat([
          path.call(print, "body", 0),
          "(",
          indent(concat([softline, proc])),
          concat([softline, ")"])
        ])
      );
    }
    if (proc) {
      return path.call(print, "body", 0);
    }
    return concat(path.map(print, "body"));
  },
  next: (path, opts, print) => {
    const args = path.getValue().body[0].body[0];

    if (!args) {
      return "next";
    }

    if (args.body[0].type === "paren") {
      // Ignoring the parens node and just going straight to the content
      return concat([
        "next ",
        path.call(print, "body", 0, "body", 0, "body", 0, "body", 0)
      ]);
    }

    return concat(["next ", join(", ", path.call(print, "body", 0))]);
  },
  paren: (path, opts, print) => {
    if (!path.getValue().body[0]) {
      return "()";
    }

    let content = path.call(print, "body", 0);

    if (
      ["args", "args_add_star", "args_add_block"].includes(
        path.getValue().body[0].type
      )
    ) {
      content = join(concat([",", line]), content);
    }

    return group(
      concat([
        "(",
        indent(concat([softline, content])),
        concat([softline, ")"])
      ])
    );
  },
  program: (path, opts, print) =>
    markAsRoot(
      concat([join(literalline, path.map(print, "body")), literalline])
    ),
  stmts: (path, opts, print) => {
    const stmts = path.getValue().body;
    const parts = [];
    let lineNo = null;

    stmts.forEach((stmt, index) => {
      if (stmt.type === "void_stmt") {
        return;
      }

      const printed = path.call(print, "body", index);

      if (lineNo === null) {
        parts.push(printed);
      } else if (
        stmt.start - lineNo > 1 ||
        [stmt.type, stmts[index - 1].type].includes("access_ctrl")
      ) {
        parts.push(hardline, hardline, printed);
      } else if (
        stmt.start !== lineNo ||
        path.getParentNode().type !== "string_embexpr"
      ) {
        parts.push(hardline, printed);
      } else {
        parts.push("; ", printed);
      }

      lineNo = stmt.end;
    });

    return concat(parts);
  },
  symbol: prefix(":"),
  symbol_literal: concatBody,
  unary: (path, opts, print) => {
    const operator = path.getValue().body[0];

    return concat([
      operator === "not" ? "not " : operator[0],
      path.call(print, "body", 1)
    ]);
  },
  var_field: concatBody,
  var_ref: first,
  vcall: first,
  yield: (path, opts, print) => {
    if (path.getValue().body[0].type === "paren") {
      return concat(["yield", path.call(print, "body", 0)]);
    }

    return concat(["yield ", join(", ", path.call(print, "body", 0))]);
  },
  yield0: literal("yield")
};

module.exports = Object.assign(
  {},
  require("./nodes/alias"),
  require("./nodes/args"),
  require("./nodes/arrays"),
  require("./nodes/assign"),
  require("./nodes/blocks"),
  require("./nodes/calls"),
  require("./nodes/case"),
  require("./nodes/commands"),
  require("./nodes/conditionals"),
  require("./nodes/constants"),
  require("./nodes/hashes"),
  require("./nodes/hooks"),
  require("./nodes/lambdas"),
  require("./nodes/loops"),
  require("./nodes/massign"),
  require("./nodes/methods"),
  require("./nodes/params"),
  require("./nodes/regexp"),
  require("./nodes/rescue"),
  require("./nodes/scopes"),
  require("./nodes/strings"),
  nodes
);
