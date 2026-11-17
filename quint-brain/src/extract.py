# Pull Quint's brain out of Chart Wizard's sources: the named top-level chunks and everything they use.
import re, glob, json, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'chart-wizard', 'src') + '/'  # Quint Brain reuses Chart Wizard's own functions, copied from its source
ORDER = ['core.js','live.js','game.js','pillars.js','coach.js','news.js','quint.js','qlab.js','dock.js']
src = {f: open(SRC + f).read() for f in ORDER}
def split_top(s):
    """Top-level statements: a statement ends at a newline outside any bracket, string, template or comment."""
    out, start, i, n = [], 0, 0, len(s)
    depth = 0; stack = []  # stack of 'tpl' markers for template literals with ${ } nesting
    last = '\n'  # last significant char, for regex detection
    while i < n:
        c = s[i]
        if stack and stack[-1] == 'tpl':
            if c == '\\': i += 2; continue
            if c == '`': stack.pop(); last = '`'; i += 1; continue
            if c == '$' and i + 1 < n and s[i+1] == '{': depth += 1; stack.append(('expr', depth)); i += 2; last = '{'; continue
            i += 1; continue
        if c == '/' and i + 1 < n and s[i+1] == '/':
            j = s.find('\n', i); i = n if j < 0 else j; continue
        if c == '/' and i + 1 < n and s[i+1] == '*':
            j = s.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '"\'':
            q = c; i += 1
            while i < n and s[i] != q:
                if s[i] == '\\': i += 1
                if s[i] == '\n': break
                i += 1
            i += 1; last = q; continue
        if c == '`': stack.append('tpl'); i += 1; continue
        if c == '/' and (last in '(,=:[!&|?{};+-*%<>~^\n' or s[max(0,i-7):i].rstrip().endswith(('return', 'typeof'))):
            i += 1; cls = False
            while i < n:
                if s[i] == '\\': i += 2; continue
                if s[i] == '[': cls = True
                elif s[i] == ']': cls = False
                elif s[i] == '/' and not cls: break
                elif s[i] == '\n': break
                i += 1
            i += 1
            while i < n and s[i].isalpha(): i += 1
            last = '/'; continue
        if c in '([{':
            depth += 1
        elif c in ')]}':
            if c == '}' and stack and isinstance(stack[-1], tuple) and stack[-1][1] == depth:
                stack.pop(); depth -= 1; last = '}'; i += 1; continue
            depth -= 1
        if c == '\n' and depth == 0 and not stack:
            j = i + 1
            if j >= n or (s[j] not in ' \t\n}])' and s[j:j+1] != ''):
                out.append(s[start:i]); start = i + 1
        if not c.isspace(): last = c
        i += 1
    if start < n: out.append(s[start:])
    return [x for x in out if x.strip()]
def chunks(s, f):
    res = []
    for body in split_top(s):
        h = body.lstrip('\n').split('\n')[0]
        m = re.match(r'^(?:async )?function ([A-Za-z_$][\w$]*)', h)
        names = [m.group(1)] if m else (re.findall(r'(?:^(?:const|let|var) |, )([A-Za-z_$][\w$]*) = ', h) if h.startswith(('const ','let ','var ')) else [])
        res.append((names, body, f))
    return res
ALL = []
for f in ORDER: ALL += chunks(src[f], f)
by = {}
for i, (names, body, f) in enumerate(ALL):
    for n in names:
        if n not in by or f == 'dock.js': by[n] = i   # dock.js wins where names repeat
def idents(body):
    b = re.sub(r'//[^\n]*', '', body)
    b = re.sub(r'`(?:\\.|[^`\\])*`', lambda m: ' '.join(re.findall(r'\$\{([^}]*)\}', m.group(0))), b)  # keep ${...} expressions
    b = re.sub(r'"(?:\\.|[^"\\\n])*"', '""', b); b = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", b)
    return set(re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)\b', b))
MINE = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else set()   # supplied by the new app
roots = sys.argv[1].split(',')
need, todo = [], list(roots)
seen = set()
while todo:
    n = todo.pop()
    if n in seen or n in MINE or n not in by: continue
    seen.add(n); i = by[n]
    if i in need: continue
    need.append(i)
    for x in idents(ALL[i][1]):
        if x not in seen and x in by and x not in MINE: todo.append(x)
need.sort()
tot = 0
for i in need:
    names, body, f = ALL[i]; tot += len(body)
    print(f"{f:10} {','.join(names)[:60]:60} {len(body)}", file=sys.stderr)
print("TOTAL", tot, file=sys.stderr)
open(os.path.join(HERE, 'brain_raw.js'), 'w').write('\n'.join(ALL[i][1] for i in need) + '\n')
