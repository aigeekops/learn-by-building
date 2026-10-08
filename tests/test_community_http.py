"""Community changes persist only public link settings, never learning records."""
import io
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from server import Handler


class CommunityHTTPTests(unittest.TestCase):
    def request(self, body):
        h=Handler.__new__(Handler);raw=json.dumps(body).encode();h.path='/api/community';h.server=SimpleNamespace(server_port=8999)
        h.headers={'Host':'127.0.0.1:8999','Content-Type':'application/json','Content-Length':str(len(raw))};h.rfile=io.BytesIO(raw)
        out=[];h.send=lambda data,status=200,**kw:out.append((data,status));h.do_POST();return out[0]

    @patch('server.core.save_config')
    def test_only_validated_public_configuration_is_written(self, save):
        self.assertEqual(self.request({'repository':'owner/course','discussions_enabled':True})[1],200)
        save.assert_called_once_with('community',{'repository':'https://github.com/owner/course','discussions_enabled':True})
        save.reset_mock()
        for body in ({'repository':'https://evil.test/a/b'}, {'repository':'owner/course','discussions_enabled':'true'}, {'repository':'','discussions_enabled':True}):
            self.assertEqual(self.request(body)[1],400)
        save.assert_not_called()
