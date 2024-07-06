local Util = require("github.util")

local M = {}

M.keep = {
  "tests/minit.lua",
  "LICENSE.md",
}

M.props = {
  ["LazyVim"] = {
    spec = '{ "LazyVim/LazyVim", import = "lazyvim.plugins" },',
    feature_request = {
      top = [[
  - type: markdown
    attributes:
      value: |
        **IMPORTANT:** ideas or requests related to extras, should go in the [Extra Requests](https://github.com/LazyVim/LazyVim/discussions/categories/extra-requests)
        discussion forum.
      ]],
      checks = [[
        - label: This is not a request for a new or existing extra (see above)
          required: true
      ]],
    },
  },
  ["lazy.nvim"] = { spec = "" },
}

M.repos = {
  "LazyVim/LazyVim",
  "folke/drop.nvim",
  "folke/edgy.nvim",
  "folke/flash.nvim",
  "folke/github",
  "folke/lazydev.nvim",
  "folke/lazy.nvim",
  "folke/neoconf.nvim",
  "folke/neodev.nvim",
  "folke/noice.nvim",
  "folke/persistence.nvim",
  "folke/styler.nvim",
  "folke/todo-comments.nvim",
  "folke/tokyonight.nvim",
  "folke/trouble.nvim",
  "folke/ts-comments.nvim",
  "folke/which-key.nvim",
  "folke/zen-mode.nvim",
}

---@param dir string
---@param props table
function M.templates(dir, props)
  local have_tests = vim.uv.fs_stat(dir .. "/tests") ~= nil
  local have_contributing = vim.uv.fs_stat(dir .. "/CONTRIBUTING.md") ~= nil
  if have_contributing then
    props.checklist = vim.trim([[
## Checklist

- [ ] I've read the [CONTRIBUTING](https://github.com/LazyVim/LazyVim/blob/main/CONTRIBUTING.md) guidelines.
    ]])
  else
    props.checklist = ""
  end
  props.tests = tostring(have_tests)
  local tpl_dir = vim.fs.normalize(Util.me .. "/templates")
  vim.fs.find(function(name, path)
    local tpl = (path .. "/" .. name):sub(#tpl_dir + 2)
    if vim.tbl_contains(M.keep, tpl) and vim.uv.fs_stat(dir .. "/" .. tpl) then
      print(" - skipping", tpl)
      return false
    end

    if tpl:find(".github") and dir:find("/github$") then
      print(" - skipping", tpl)
      return false
    end

    if (tpl:find("scripts") or tpl:find("tests")) and not have_tests then
      print(" - skipping", tpl)
      return false
    end
    props = vim.deepcopy(props)
    for k, v in pairs(M.props[props.name] or {}) do
      props[k] = v
    end
    if not props.spec then
      props.spec = ([[{ "%s", opts = {} },]]):format(props.repo)
    end
    props.feature_request = vim.tbl_deep_extend("keep", props.feature_request or {}, {
      top = "",
      checks = "",
    })
    Util.template(dir, tpl, props)
    if tpl:find("scripts") then
      vim.uv.fs_chmod(dir .. "/" .. tpl, tonumber("755", 8))
    end
  end, { path = tpl_dir, type = "file" })
end

function M.rm(dir, file)
  local path = dir .. "/" .. file
  if vim.uv.fs_stat(path) then
    print(" - removing", path)
    vim.uv.fs_unlink(path)
  end
end

function M.update(repo)
  print("updating", repo)
  local parts = vim.split(repo, "/")
  assert(#parts == 2, "Invalid repo: " .. repo)

  local target = vim.env.BUILD_TARGET or ("~/projects/" .. parts[2])
  local dir = vim.fs.normalize(target)

  assert(vim.uv.fs_stat(dir), "Directory does not exist: " .. dir)

  M.rm(dir, "tests/run")
  M.rm(dir, "tests/init.lua")

  M.templates(dir, { name = parts[2], repo = repo })
end

function M.build()
  ---@type string[]
  local repos = vim.env.BUILD_REPO and { vim.env.BUILD_REPO } or M.repos
  for _, repo in ipairs(repos) do
    M.update(repo)
  end
end
M.build()

return M
