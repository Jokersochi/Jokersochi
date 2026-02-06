import re, json
with open('cursor_agents.html', 'r', encoding='utf-8') as f:
    data = f.read()
pattern = '__PAGE__?'
start = data.find(pattern)
print('pattern idx', start)
if start == -1:
    raise SystemExit('not found')
start += len(pattern)
while start < len(data) and data[start] != '{':
    start += 1
end = start
brace = 0
in_string = False
escape = False
while end < len(data):
    ch = data[end]
    if in_string:
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == '"':
            in_string = False
    else:
        if ch == '"':
            in_string = True
        elif ch == '{':
            brace += 1
        elif ch == '}':
            brace -= 1
            if brace == 0:
                end += 1
                break
    end += 1
json_str = data[start:end]
print('raw snippet:', json_str[:200])
json_str = json_str.encode('utf-8').decode('unicode_escape')
print('decoded snippet:', json_str[:200])
parsed = json.loads(json_str)
print(json.dumps(parsed, indent=2)[:4000])
