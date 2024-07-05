local M = {}

M.me = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":p:h:h:h")

function M.read(file)
	local fd = assert(io.open(file, "r"))
	---@type string
	local data = fd:read("*a")
	fd:close()
	return data
end

function M.write(file, contents)
	local fd = assert(io.open(file, "w+"))
	fd:write(contents)
	fd:close()
end

---@param str string template string
---@param props table key value pairs to replace in the string
function M._template(str, props)
	local lines = vim.split(str, "\n")
	lines = vim.tbl_map(function(line)
		return line:gsub("(%$%b{})", function(w)
			local ret = vim.tbl_get(props, unpack(vim.split(w:sub(3, -2), ".", { plain = true })))
			assert(ret, "Property not found: " .. w)
			return ret
		end)
	end, lines)
	return table.concat(lines, "\n")
end

---@param dir string
---@param tpl string
---@param props table
function M.template(dir, tpl, props)
	dir = vim.fs.normalize(dir)
	local fin = vim.fn.fnamemodify(M.me .. "/templates/" .. tpl, ":p")
	assert(vim.uv.fs_stat(fin), "Template does not exist: " .. fin)

	local fout = vim.fn.fnamemodify(dir .. "/" .. tpl, ":p")
	vim.fn.mkdir(vim.fn.fnamemodify(fout, ":p:h"), "p")

	local data = M.read(fin)
	data = M._template(data, props)
	M.write(fout, data)
end

return M
-- rg -l --hidden --glob='**/*.nvim/.github/workflows/*.yml' '\.deb' | rg -v repro
