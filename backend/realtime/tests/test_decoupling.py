"""`architecture.tex` §5.1, asserted rather than trusted.

`notifications` already carries this test for itself. The gateway needs its own
copy because it hooks the *same* event from the *same* seam, and the argument
for the seam only holds while both directions stay clean:

  * **`messaging` must not import `realtime`.** If it did, the write path would
    depend on the delivery path, and a bonus module that was cut at a gate would
    have taken the mandatory product with it.
  * **`realtime` must not be imported by any domain module.** The gateway
    subscribes; nobody calls it.

The calendar's Day 7 log names this as the reason `common/events.py` exists —
"it is what lets the real-time bonus hook the same events without touching
messaging". This file is that claim, checkable.
"""

import ast
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent.parent

# Every module that publishes an event the gateway consumes, plus the two that
# publish the other two events. None of them may know the gateway exists.
PUBLISHERS = ('messaging', 'groups_app', 'channels_app', 'roles')


def imports_of(package, module):
    """Every line in `package` that imports `module`, ignoring tests and
    migrations."""
    offenders = []

    for path in (BACKEND / package).rglob('*.py'):
        if 'migrations' in path.parts or 'tests' in path.parts:
            continue
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and (node.module or '').startswith(module):
                offenders.append(f'{path.relative_to(BACKEND)}:{node.lineno}')
            if isinstance(node, ast.Import):
                offenders += [
                    f'{path.relative_to(BACKEND)}:{node.lineno}'
                    for alias in node.names
                    if alias.name.startswith(module)
                ]

    return offenders


@pytest.mark.parametrize('publisher', PUBLISHERS)
def test_no_domain_module_imports_the_gateway(publisher):
    assert imports_of(publisher, 'realtime') == []


def test_the_gateway_does_not_import_notifications():
    """The two subscribers are peers. Either one importing the other would put
    delivery order back into the code rather than in the seam."""
    assert imports_of('realtime', 'notifications') == []


def test_the_gateway_subscribes_to_message_created():
    from common import events
    from realtime import publisher

    assert publisher.on_message_created in events._subscribers[events.MESSAGE_CREATED]


OWNERSHIP_ATTRS = {'owner_id', 'owner', 'admin_id', 'admin', 'is_admin'}


def test_the_consumer_asks_roles_rather_than_deciding():
    """No module decides permissions for itself.

    Checked against the parsed tree rather than the file's text, because the
    first version of this test grepped for `owner_id ==` and failed on the
    docstring in `consumers.py` telling the next person not to write it. A
    comment saying "do not do X" is not an instance of X.
    """
    tree = ast.parse((BACKEND / 'realtime' / 'consumers.py').read_text())

    ownership_comparisons = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Compare)
        for side in [node.left, *node.comparators]
        if isinstance(side, ast.Attribute) and side.attr in OWNERSHIP_ATTRS
    ]

    assert ownership_comparisons == []

    # And the positive half: it delegates both membership questions.
    called = {
        node.func.attr
        for node in ast.walk(tree)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
    }
    assert {'is_group_member', 'is_channel_member'} <= called
