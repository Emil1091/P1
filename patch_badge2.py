p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\components\OLTListSidebar.tsx"
s = open(p, 'r', encoding='utf-8').read()

# Replace OLT name badge block
old1 = """                      {oltWorst !== 'normal' && (
                        oltWorst === 'offline' ? (
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-red-600 text-white heartbeat"
                            title="Hay cajas sin señal (off)"
                          >
                            <X className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <AlertTriangle
                            className="w-4 h-4 text-amber-400 heartbeat"
                            title="Hay cajas atenuadas"
                          />
                        )
                      )}"""
new1 = """                      {oltWorst !== 'normal' && (
                        <AlertTriangle
                          className={`w-4 h-4 heartbeat ml-1 ${oltWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`}
                          title={oltWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}
                        />
                      )}"""
assert old1 in s, "olt block not found"
s = s.replace(old1, new1, 1)

# Per-PON badge block
old2 = """{ponWorst !== 'normal' && (
  ponWorst === 'offline' ? (
    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-md bg-red-600 text-white heartbeat ml-1" title="Hay cajas sin señal (off)">
      <X className="w-2.5 h-2.5" />
    </span>
  ) : (
    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 heartbeat ml-1" title="Hay cajas atenuadas" />
  )
)}"""
new2 = """{ponWorst !== 'normal' && (
  <AlertTriangle
    className={`w-3.5 h-3.5 ml-1 heartbeat ${ponWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`}
    title={ponWorst === 'offline' ? 'Hay cajas sin señal (off)' : 'Hay cajas atenuadas'}
  />
)}"""
assert old2 in s, "pon block not found"
s = s.replace(old2, new2, 1)

# Subtle heartbeat keyframes (smaller scale + longer duration)
s = s.replace(
    "@keyframes heartbeat { 0%{transform:scale(1);} 14%{transform:scale(1.35);} 28%{transform:scale(1);} 42%{transform:scale(1.35);} 70%{transform:scale(1);} }\n        .heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }",
    "@keyframes heartbeat { 0%{transform:scale(1);} 15%{transform:scale(1.12);} 30%{transform:scale(1);} 100%{transform:scale(1);} }\n        .heartbeat { animation: heartbeat 2.6s ease-in-out infinite; }",
    1
)

open(p, 'w', encoding='utf-8').write(s)
print("done")