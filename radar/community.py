"""Validate local GitHub community settings without contacting GitHub."""
import re


_REPOSITORY = re.compile(
    r'(?P<owner>[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/'
    r'(?P<repo>[A-Za-z0-9._-]{1,100})'
)
_PREFIX = 'https://github.com/'


def normalize_repository(value):
    """Return a canonical HTTPS repository URL, or an empty unconnected value.

    Accept only ``owner/repo`` or ``https://github.com/owner/repo``.
    This checks syntax, not repository existence, access, or enabled features.
    """
    if not isinstance(value, str):
        raise ValueError('GitHub 仓库请填写 owner/repo 或 https://github.com/owner/repo')
    value = value.strip()
    if not value:
        return ''
    path = value[len(_PREFIX):] if value.startswith(_PREFIX) else value
    match = _REPOSITORY.fullmatch(path)
    if not match or match['repo'] in ('.', '..') or '--' in match['owner']:
        raise ValueError('GitHub 仓库地址无效：只接受 owner/repo 或标准 HTTPS 仓库地址')
    return _PREFIX + path


def clean(body):
    """Return validated settings; raise ValueError without modifying the input.

    Callers can persist the returned object with ``core.save_config``. Missing
    fields use the unconnected defaults. The enabled flag is user-confirmed
    configuration, never proof that GitHub Discussions is available.
    """
    if not isinstance(body, dict):
        raise ValueError('社区配置必须是对象')
    if set(body) - {'repository', 'discussions_enabled'}:
        raise ValueError('社区配置包含不支持的字段')
    repository = normalize_repository(body.get('repository', ''))
    enabled = body.get('discussions_enabled', False)
    if type(enabled) is not bool:
        raise ValueError('Discussions 开关必须为 true 或 false')
    if enabled and not repository:
        raise ValueError('启用社区入口前请先填写 GitHub 仓库')
    return {'repository': repository, 'discussions_enabled': enabled}
