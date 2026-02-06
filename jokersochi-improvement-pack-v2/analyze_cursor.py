import re
with open('cursor_agents.html', 'r', encoding='utf-8') as f:
    data = f.read()
matches = list(re.finditer(r'self.__next_f.push\\(\\[1,\"(.*?)\"\\]\\)', data))
print('chunks', len(matches))
idx = data.find('bc-a99878f6-7525-4db6-bf6a-991bcd8074cb')
print('idx', idx)
if idx != -1:
    print(data[max(0, idx-200): idx+200])
