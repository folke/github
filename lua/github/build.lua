local Util = require("github.util")

local M = {}

M.keep = {
	"tests/minit.lua",
}

M.props = {
	["LazyVim"] = {
		spec = '{ "LazyVim/LazyVim", import = "lazyvim.plugins" }',
	},
}

---@param dir string
---@param props table
function M.templates(dir, props)
	local tpl_dir = vim.fs.normalize(Util.me .. "/templates")
	vim.fs.find(function(name, path)
		local tpl = (path .. "/" .. name):sub(#tpl_dir + 2)
		if vim.tbl_contains(M.keep, tpl) and vim.uv.fs_stat(dir .. "/" .. tpl) then
			print("skipping", tpl)
			return false
		end
		props = vim.deepcopy(props)
		for k, v in pairs(M.props[props.name] or {}) do
			props[k] = v
		end
		if not props.spec then
			props.spec = ([[{ "%s", opts = {} }]]):format(props.repo)
		end
		Util.template(dir, tpl, props)
		if tpl:find("scripts") then
			vim.uv.fs_chmod(dir .. "/" .. tpl, tonumber("755", 8))
		end
	end, { path = tpl_dir, type = "file" })
end

function M.update(repo)
	print("Updating", repo)
	local parts = vim.split(repo, "/")
	assert(#parts == 2, "Invalid repo: " .. repo)

	local dir = vim.fs.normalize("~/projects/" .. parts[2])

	assert(vim.uv.fs_stat(dir), "Directory does not exist: " .. dir)

	M.templates(dir, { name = parts[2], repo = repo })
end

M.update("LazyVim/LazyVim")
M.update("folke/flash.nvim")

return M
