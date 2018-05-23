const {
  align, concat, dedent, group, hardline, ifBreak, indent, join, line,
  literalline, markAsRoot, softline
} = require("prettier").doc.builders;

const concatBody = (path, print) => concat(path.map(print, "body"));

const nodes = {
  alias: (path, print) => concat([
    "alias ",
    join(" ", path.map(print, "body"))
  ]),
  aref: (path, print) => concat([
    path.call(print, "body", 0),
    "[",
    path.call(print, "body", 1),
    "]"
  ]),
  arg_paren: (path, print) => {
    if (path.getValue().body === null) {
      return "";
    }

    return group(concat([
      "(",
      concat(path.map(print, "body")),
      ")"
    ]))
  },
  args_add: (path, print) => {
    if (path.getValue().body[0].type === "args_new") {
      return path.map(print, "body");
    }

    return [...path.call(print, "body", 0), ",", line, path.call(print, "body", 1)];
  },
  args_add_block: (path, print) => {
    const [_, block] = path.getValue().body;
    const parts = path.call(print, "body", 0).slice(1);

    if (block) {
      parts.push(concat(["&", path.call(print, "body", 1)]));
    }

    return group(concat(parts));
  },
  args_add_star: (path, print) => path.call(print, "body", 0).concat([
    ",",
    line,
    "*",
    path.call(print, "body", 1)
  ]),
  args_new: (path, print) => group(concat(["[", softline])),
  array: (path, print) => {
    const elements = path.call(print, "body", 0);

    return group(concat([
      elements[0],
      indent(concat(elements.slice(1))),
      softline,
      "]"
    ]));
  },
  assoc_new: (path, print) => {
    const parts = [];

    switch (path.getValue().body[0].type) {
      case "@label":
        parts.push(path.call(print, "body", 0));
        break;
      case "symbol_literal":
        parts.push(concat([
          path.call(print, "body", 0).parts[0].parts[1],
          ":"
        ]));
        break;
      default:
        parts.push(path.call(print, "body", 0), " =>")
        break;
    }

    parts.push(line, indent(path.call(print, "body", 1)));

    return group(concat(parts));
  },
  assoc_splat: (path, print) => group(concat([
    "**",
    path.call(print, "body", 0)
  ])),
  assoclist_from_args: (path, print) => group(
    join(concat([",", line]),
    path.map(print, "body", 0))
  ),
  assign: (path, print) => group(concat([
    path.call(print, "body", 0),
    " =",
    indent(concat([line, path.call(print, "body", 1)]))
  ])),
  bare_assoc_hash: (path, print) => group(
    join(concat([",", line]),
    path.map(print, "body", 0)
  )),
  begin: (path, print) => group(concat([
    "begin",
    indent(concat([hardline, concat(path.map(print, "body"))])),
    group(concat([hardline, "end"]))
  ])),
  binary: (path, print) => join(` ${path.getValue().body[1]} `, [
    path.call(print, "body", 0),
    path.call(print, "body", 2)
  ]),
  block_var: (path, print) => concat(["|", path.call(print, "body", 0), "| "]),
  bodystmt: (path, print) => {
    const [statements, ...additions] = path.getValue().body;
    const parts = [path.call(print, "body", 0)];

    additions.forEach((addition, index) => {
      if (addition) {
        parts.push(dedent(concat([
          hardline,
          path.call(print, "body", index + 1)
        ])));
      }
    });

    return group(concat(parts));
  },
  brace_block: (path, print) => concat([
    "{ ",
    path.call(print, "body", 0),
    concat(path.map(print, "body", 1)),
    " }"
  ]),
  break: (path, print) => {
    if (path.getValue().body[0].length > 0) {
      return concat(["break ", path.call(print, "body", 0)]);
    }
    return "break";
  },
  call: (path, print) => join(path.getValue().body[1], [
    path.call(print, "body", 0),
    path.call(print, "body", 2)
  ]),
  case: (path, print) => group(concat([
    group(concat(["case ", path.call(print, "body", 0)])),
    group(concat([hardline, path.call(print, "body", 1)])),
    group(concat([hardline, "end"]))
  ])),
  class: (path, print) => {
    const [_constant, superclass, _statements] = path.getValue().body;
    const parts = ["class ", path.call(print, "body", 0)];

    if (superclass) {
      parts.push(" < ", path.call(print, "body", 1));
    }

    return group(concat([
      group(concat(parts)),
      indent(path.call(print, "body", 2)),
      group(concat([hardline, "end"]))
    ]));
  },
  command: (path, print) => group(join(" ", path.map(print, "body"))),
  const_path_ref: (path, print) => join("::", path.map(print, "body")),
  const_ref: (path, print) => path.call(print, "body", 0),
  def: (path, print) => concat([
    group(concat([
      hardline,
      "def ",
      path.call(print, "body", 0),
      path.call(print, "body", 1)
    ])),
    indent(concat([hardline, path.call(print, "body", 2)])),
    group(concat([hardline, "end"]))
  ]),
  defined: (path, print) => group(concat([
    "defined?(",
    softline,
    indent(concat(path.map(print, "body"))),
    softline,
    ")"
  ])),
  do_block: (path, print) => {
    const parts = ["do"];

    if (path.getValue().body[0]) {
      parts.push(" ", path.call(print, "body", 0));
    }

    parts.push(
      indent(concat([hardline, path.call(print, "body", 1)])),
      group(concat([hardline, "end"]))
    );

    return group(concat(parts));
  },
  dot2: (path, print) => concat([
    path.call(print, "body", 0),
    "..",
    path.call(print, "body", 1)
  ]),
  dot3: (path, print) => concat([
    path.call(print, "body", 0),
    "...",
    path.call(print, "body", 1)
  ]),
  dyna_symbol: (path, print) => concat([
    ":\"",
    concat(path.map(print, "body")),
    "\""
  ]),
  else: (path, print) => group(concat([
    "else",
    indent(concat([hardline, path.call(print, "body", 0)]))
  ])),
  elsif: (path, print) => {
    const [_predicate, _statements, addition] = path.getValue().body;
    const parts = [
      group(concat(["elsif ", path.call(print, "body", 0)])),
      indent(concat([hardline, path.call(print, "body", 1)]))
    ];

    if (addition) {
      parts.push(group(concat([hardline, path.call(print, "body", 2)])));
    }

    return group(concat(parts));
  },
  ensure: (path, print) => group(concat([
    "ensure",
    indent(concat([hardline, concat(path.map(print, "body"))]))
  ])),
  fcall: concatBody,
  hash: (path, print) => group(concat([
    "{",
    indent(concat([line, concat(path.map(print, "body"))])),
    concat([line, "}"])
  ])),
  if: (path, print) => {
    const [_predicate, _statements, addition] = path.getValue().body;
    const parts = [
      group(concat(["if ", path.call(print, "body", 0)])),
      indent(concat([hardline, path.call(print, "body", 1)])),
      hardline,
    ];

    if (addition) {
      parts.push(group(concat([path.call(print, "body", 2), hardline])));
    }

    parts.push(group(concat(["end", hardline])));
    return group(concat(parts));
  },
  massign: (path, print) => group(concat([
    path.call(print, "body", 0),
    " =",
    indent(concat([line, path.call(print, "body", 1)]))
  ])),
  method_add_arg: (path, print) => {
    if (path.getValue().body[1].type === "args_new") {
      return path.call(print, "body", 0);
    }
    return group(concat(path.map(print, "body")));
  },
  method_add_block: (path, print) => join(" ", path.map(print, "body")),
  mlhs_add: (path, print) => {
    if (path.getValue().body[0].type === "mlhs_new") {
      return path.call(print, "body", 1);
    }

    return concat([
      path.call(print, "body", 0),
      ",",
      line,
      path.call(print, "body", 1)
    ]);
  },
  mlhs_add_post: (path, print) => group(concat([
    path.call(print, "body", 0),
    ",",
    group(concat([line, path.call(print, "body", 1)]))
  ])),
  mlhs_add_star: (path, print) => group(concat([
    path.call(print, "body", 0),
    ",",
    group(concat([line, "*", path.call(print, "body", 1)]))
  ])),
  mrhs_add_star: (path, print) => group(concat([
    "*",
    concat(path.map(print, "body"))
  ])),
  mlhs_paren: (path, print) => group(concat([
    "(",
    indent(concat([softline, path.call(print, "body", 0)])),
    concat([softline, ")"])
  ])),
  mlhs_new: (path, print) => "",
  mrhs_new_from_args: (path, print) => concat(path.call(print, "body", 0).slice(1)),
  module: (path, print) => group(concat([
    group(concat(["module ", path.call(print, "body", 0)])),
    indent(path.call(print, "body", 1)),
    dedent(concat([hardline, "end"]))
  ])),
  mrhs_add: (path, print) => {
    if (path.getValue().body[0].type === "mrhs_new") {
      return path.call(print, "body", 1);
    }

    return concat([
      path.call(print, "body", 0),
      ",",
      line,
      path.call(print, "body", 1)
    ]);
  },
  mrhs_new: (path, print) => "",
  next: (path, print) => {
    if (path.getValue().body.length > 0) {
      return concat(["next ", path.call(print, "body", 0)]);
    }
    return "next";
  },
  params: (path, print) => {
    const [reqs, opts, _1, _2, kwargs, _3, _4] = path.getValue().body;
    let parts = [];

    if (reqs) {
      parts = parts.concat(path.map(print, "body", 0));
    }

    if (opts) {
      parts = parts.concat(opts.map((_, index) => concat([
        path.call(print, "body", 1, index, 0),
        " = ",
        path.call(print, "body", 1, index, 1)
      ])));
    }

    if (kwargs) {
      parts = parts.concat(kwargs.map(([kwarg, value], index) => {
        if (!value) {
          return path.call(print, "body", 4, index, 0);
        }
        return group(join(" ", path.map(print, "body", 4, index)));
      }));
    }

    return join(", ", parts);
  },
  paren: (path, print) => (
    concat(["(", concat(path.getValue().body.reduce((parts, part, index) => {
      if (Array.isArray(part)) {
        return parts.concat(path.map(print, "body", index));
      }
      return [...parts, path.call(print, "body", index)];
    }, [])), ")"])
  ),
  program: (path, print) => markAsRoot(concat([
    join(literalline, path.map(print, "body")),
    literalline
  ])),
  qsymbols_add: (path, print) => {
    if (path.getValue().body[0].type === "qsymbols_new") {
      return path.map(print, "body");
    }
    return [...path.call(print, "body", 0), line, path.call(print, "body", 1)];
  },
  qsymbols_new: (path, print) => group(concat(["%i[", softline])),
  qwords_add: (path, print) => {
    if (path.getValue().body[0].type === "qwords_new") {
      return path.map(print, "body");
    }
    return [...path.call(print, "body", 0), line, path.call(print, "body", 1)];
  },
  qwords_new: (path, print) => group(concat(["%w[", softline])),
  redo: (path, print) => "redo",
  regexp_add: concatBody,
  regexp_literal: (path, print) => {
    const delim = path.call(print, "body", 1);

    const delimPairs = { "]": "[", "}": "{", ")": "(" };
    const startDelim = delim[0] === "/" ? "/" : `%r${delimPairs[delim[0]]}`;

    return group(concat([
      startDelim,
      indent(concat([softline, path.call(print, "body", 0)])),
      softline,
      delim
    ]));
  },
  regexp_new: (path, print) => "",
  rescue: (path, print) => {
    const [exception, variable, _statements, addition] = path.getValue().body;
    const parts = ["rescue"];

    if (exception) {
      parts.push(group(concat([" ", join(", ", path.map(print, "body", 0))])));
    }

    if (variable) {
      parts.push(group(concat([" => ", path.call(print, "body", 1)])));
    }

    parts.push(indent(concat([hardline, path.call(print, "body", 2)])));

    if (addition) {
      parts.push(concat([hardline, path.call(print, "body", 3)]));
    }

    return group(concat(parts));
  },
  retry: (path, print) => "retry",
  return: (path, print) => group(concat(["return ", concat(path.map(print, "body"))])),
  return0: (path, print) => "return",
  sclass: (path, print) => group(concat([
    group(concat([hardline, "class << ", path.call(print, "body", 0)])),
    indent(path.call(print, "body", 1)),
    concat([hardline, "end"])
  ])),
  stmts_add: (path, print) => {
    if (path.getValue().body[0].type === "stmts_new") {
      return path.call(print, "body", 1);
    }
    return group(join(hardline, path.map(print, "body")));
  },
  stmts_new: (path, print) => "",
  string_add: (path, print) => {
    const delim = path.getValue().body.some(({ type }) => type === "string_embexpr") ? "\"" : "'";
    return concat([delim, concat(path.map(print, "body")), delim]);
  },
  string_concat: (path, print) => group(concat([
    path.call(print, "body", 0),
    " \\",
    indent(concat([line, path.call(print, "body", 1)]))
  ])),
  string_content: (path, print) => "",
  string_add: (path, print) => {
    const delim = path.getValue().body.some(({ type }) => type === "string_embexpr") ? "\"" : "'";
    return concat([delim, concat(path.map(print, "body")), delim]);
  },
  string_embexpr: (path, print) => concat(["#{", concat(path.map(print, "body")), "}"]),
  string_literal: concatBody,
  super: (path, print) => group(concat([
    "super",
    concat(path.map(print, "body"))
  ])),
  symbol: (path, print) => concat([
    ":",
    concat(path.map(print, "body"))
  ]),
  symbol_literal: concatBody,
  symbols_add: (path, print) => {
    if (path.getValue().body[0].type === "symbols_new") {
      return path.map(print, "body");
    }
    return [...path.call(print, "body", 0), line, path.call(print, "body", 1)];
  },
  symbols_new: (path, print) => group(concat(["%I[", softline])),
  unary: (path, print) => concat([
    path.getValue().body[0][0],
    path.call(print, "body", 1)
  ]),
  undef: (path, print) => concat(["undef ", concat(path.map(print, "body", 0))]),
  unless: (path, print) => concat([
    group(concat(["unless ", path.call(print, "body", 0)])),
    indent(concat([hardline, concat(path.map(print, "body", 1))])),
    group(concat([hardline, "end"]))
  ]),
  until: (path, print) => group(concat([
    group(concat(["until ", path.call(print, "body", 0)])),
    indent(concat([hardline, concat(path.map(print, "body", 1))])),
    group(concat([hardline, "end"]))
  ])),
  var_field: concatBody,
  var_ref: (path, print) => path.call(print, "body", 0),
  vcall: concatBody,
  void_stmt: (path, print) => "",
  when: (path, print) => {
    const [_predicates, _statements, addition] = path.getValue().body;
    const parts = [
      group(concat(["when ", join(", ", path.map(print, "body", 0))])),
      indent(concat([hardline, concat(path.map(print, "body", 1))]))
    ];

    if (addition) {
      parts.push(concat([hardline, path.call(print, "body", 2)]));
    }

    return group(concat(parts));
  },
  while: (path, print) => group(concat([
    group(concat(["while ", path.call(print, "body", 0)])),
    indent(concat([hardline, concat(path.map(print, "body", 1))])),
    group(concat([hardline, "end"]))
  ])),
  word_add: concatBody,
  word_new: (path, print) => "",
  words_add: (path, print) => {
    if (path.getValue().body[0].type === "words_new") {
      return path.map(print, "body");
    }
    return [...path.call(print, "body", 0), line, path.call(print, "body", 1)];
  },
  words_new: (path, print) => group(concat(["%W[", softline])),
  xstring_add: concatBody,
  xstring_literal: (path, print) => group(concat([
    "%x[",
    softline,
    indent(concat(path.map(print, "body"))),
    softline,
    "]"
  ])),
  xstring_new: (path, print) => "",
  yield: (path, print) => concat([
    "yield ",
    concat(path.map(print, "body"))
  ]),
  yield0: (path, print) => "yield",
  zsuper: (path, print) => "super"
};

const debugNode = (path, print) => {
  console.log("=== UNSUPPORTED NODE ===");
  console.log(JSON.stringify(path.getValue(), null, 2));
  console.log("========================");
  return "";
};

const genericPrint = (path, options, print) => {
  const { type, body } = path.getValue();

  if (type[0] === "@") {
    return body;
  }

  return (nodes[type] || debugNode)(path, print);
};

module.exports = genericPrint;
