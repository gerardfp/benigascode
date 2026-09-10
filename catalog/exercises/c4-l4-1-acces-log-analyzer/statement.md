# [C5-L4-1] Access.log analyzer

El servidor web emmagaztema el registre (log) dels accessos a l'arxiu 'access.log'.
Cada accés s'emmagatzema en una línia de l'arxiu amb aquest format:

```text
%h %l %u %t "%r" %s %b "%f" "%a"
```

El significat d'aquests camps és el següent:

- %h és l'adreça IP del client que ha realitzat la petició al servidor

- %l és la identitat de la màquina del client

- %u és l'userid de la persona determinada per l'autenticació HTTP

- %t és el temps en que s'ha rebut la petició. El format és:

```text
[day/month/year:hour:minute:second zone]
day = 2*digit
month = 3*letter
year = 4*digit
hour = 2*digit
minute = 2*digit
second = 2*digit
zone = (`+' | `-') 4*digit
```

- %r és la lína de petició realitzada pel client. El format és:

```text
%M %U%q %H
```

- %M és el Mètode (GET, POST, ...)

- %U és el path del recurs sol·licitat

- %q és la query realitzada sobre el recurs

- %H és el protocol (HTTP/1.0, HTTP/1.1, ...)

- %s és l'status code que el servidor retorna al client

- %b és el tamany de l'objecte retornat al client

- %f és el lloc del qual el client reporta que ha estat referenciat

- %a és l'user-agent: la identificació del navegador web del client

Es desitja fer una anàlisi d'aquest registre per tal d'esbrinar:
- El host que més peticions realitza al servidor
- El recurs més solicitat
- El lloc que més ens referencia
- El navegador més usat pels clients
- L'hora del dia en que més peticions rep el servidor

## Input Format

L'entrada consta de diverses línies de registre amb el format indicat.
El registre acaba amb la línia "**END**"

## Constraints

No hi ha

## Output Format

S'imprimirà en distintes línies:
- El host que més peticions ha realitzat
- El recurs que més peticions ha rebut
- El referrer que més ens ha direccionat
- L'User Agent més utilitzat pels visitants
- L'hora del dia que més peticions s'han realitzat

## Sample Input 0

```text
233.192.62.103 - - [28/05/2019:12:00:06] "POST /stems HTTP/1.0" 200 10037 "http://www.casualcyclist.com" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
16.180.70.237 - - [28/05/2019:12:00:55] "POST /Store/cart.jsp HTTP/1.1" 403 4796 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
123.221.14.56 - - [28/05/2019:12:04:04] "GET /shifters HTTP/1.1" 404 8391 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
237.43.24.118 - - [28/05/2019:12:08:44] "GET /stems HTTP/1.0" 403 10931 "-" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
237.43.24.118 - - [28/05/2019:12:09:50] "POST /wheelsets HTTP/1.0" 401 8476 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
__END__
```

## Sample Output 0

```text
237.43.24.118
/stems
http://bestcyclingreviews.com/top_online_shops
Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
12
```

## Sample Input 1

```text
237.43.24.118 - - [28/05/2019:12:04:37] "POST /saddles HTTP/1.0" 200 4957 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
237.43.24.118 - - [28/05/2019:12:07:05] "GET /shifters HTTP/1.1" 200 6769 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
10.182.189.79 - - [28/05/2019:12:07:05] "POST /handle-bars HTTP/1.0" 404 3640 "http://bleater.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
233.192.62.103 - - [28/05/2019:12:11:49] "POST /stems HTTP/1.1" 403 8969 "http://bleater.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
16.180.70.237 - - [28/05/2019:12:14:57] "POST /shifters HTTP/1.1" 200 5314 "-" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
218.193.16.244 - - [28/05/2019:12:17:47] "GET /stems HTTP/1.0" 404 9107 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
__END__
```

## Sample Output 1

```text
237.43.24.118
/shifters
http://bestcyclingreviews.com/top_online_shops
Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
12
```

## Sample Input 2

```text
123.221.14.56 - - [28/05/2019:12:05:17] "POST /forks HTTP/1.1" 404 9342 "http://www.casualcyclist.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
16.180.70.237 - - [28/05/2019:12:09:21] "POST /shifters HTTP/1.0" 400 5067 "-" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
237.43.24.118 - - [28/05/2019:12:12:07] "POST /stems HTTP/1.1" 403 5667 "http://bleater.com" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
237.43.24.118 - - [28/05/2019:12:14:21] "POST /saddles HTTP/1.0" 401 5998 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
233.192.62.103 - - [28/05/2019:12:15:34] "POST /forks HTTP/1.0" 500 10796 "http://bleater.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
233.192.62.103 - - [28/05/2019:12:17:00] "GET /Store/cart.jsp HTTP/1.0" 400 4157 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
198.122.118.164 - - [28/05/2019:12:18:09] "POST /forks HTTP/1.1" 403 10388 "http://searchengine.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
218.193.16.244 - - [28/05/2019:12:21:12] "POST /shifters HTTP/1.1" 200 6273 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
__END__
```

## Sample Output 2

```text
237.43.24.118
/forks
http://www.casualcyclist.com
Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
12
```

## Sample Input 3

```text
233.192.62.103 - - [28/05/2019:12:05:12] "POST /forks HTTP/1.1" 404 7702 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
123.221.14.56 - - [28/05/2019:12:08:23] "POST /handle-bars HTTP/1.1" 400 8411 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
244.157.45.12 - - [28/05/2019:12:11:05] "GET /forks HTTP/1.0" 403 9187 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
244.157.45.12 - - [28/05/2019:12:11:20] "POST /handle-bars HTTP/1.0" 200 10467 "http://bleater.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
198.122.118.164 - - [28/05/2019:12:15:13] "POST /shifters HTTP/1.1" 401 6747 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
10.182.189.79 - - [28/05/2019:12:15:46] "POST /shifters HTTP/1.0" 400 8622 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
16.180.70.237 - - [28/05/2019:12:20:14] "POST /wheelsets HTTP/1.1" 500 4121 "http://searchengine.com" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
123.221.14.56 - - [28/05/2019:12:23:20] "GET /stems HTTP/1.1" 500 8238 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
244.157.45.12 - - [28/05/2019:12:24:47] "GET /forks HTTP/1.0" 404 8916 "-" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
233.192.62.103 - - [28/05/2019:12:29:30] "POST /forks HTTP/1.0" 500 5805 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
198.122.118.164 - - [28/05/2019:12:34:15] "GET /wheelsets HTTP/1.1" 400 4020 "http://searchengine.com" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
244.157.45.12 - - [28/05/2019:12:38:58] "POST /shifters HTTP/1.1" 200 8719 "http://www.casualcyclist.com" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
233.192.62.103 - - [28/05/2019:12:39:18] "GET /saddles HTTP/1.1" 400 4576 "http://www.casualcyclist.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
123.221.14.56 - - [28/05/2019:12:42:40] "GET /stems HTTP/1.0" 401 7821 "http://bleater.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
10.182.189.79 - - [28/05/2019:12:46:08] "POST /Store/cart.jsp HTTP/1.0" 400 5196 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
__END__
```

## Sample Output 3

```text
244.157.45.12
/forks
http://bestcyclingreviews.com/top_online_shops
Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
12
```

## Sample Input 4

```text
218.193.16.244 - - [28/05/2019:18:40:43] "GET /seatposts HTTP/1.1" 200 10910 "http://www.casualcyclist.com" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
244.157.45.12 - - [29/05/2019:02:29:38] "GET /seatposts HTTP/1.1" 500 4523 "http://bleater.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
233.192.62.103 - - [29/05/2019:06:23:52] "GET /handle-bars HTTP/1.1" 404 6068 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
10.182.189.79 - - [29/05/2019:06:45:48] "POST /forks HTTP/1.1" 500 4985 "-" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
233.192.62.103 - - [29/05/2019:14:44:21] "GET /handle-bars HTTP/1.1" 400 6577 "http://searchengine.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
237.43.24.118 - - [29/05/2019:17:01:05] "POST /forks HTTP/1.1" 401 7205 "http://searchengine.com" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
16.180.70.237 - - [29/05/2019:19:02:47] "POST /shifters HTTP/1.1" 400 3676 "http://bleater.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
10.182.189.79 - - [30/05/2019:01:03:22] "POST /forks HTTP/1.1" 404 6688 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
244.157.45.12 - - [30/05/2019:02:14:42] "POST /handle-bars HTTP/1.0" 200 4146 "http://bleater.com" "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"
233.192.62.103 - - [30/05/2019:08:53:15] "GET /forks HTTP/1.1" 403 7010 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
237.43.24.118 - - [30/05/2019:13:11:25] "POST /seatposts HTTP/1.0" 404 7092 "-" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
114.214.178.92 - - [30/05/2019:17:16:27] "GET /forks HTTP/1.0" 403 8924 "http://www.casualcyclist.com" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
244.157.45.12 - - [31/05/2019:00:41:00] "POST /Store/cart.jsp HTTP/1.1" 401 8000 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
218.193.16.244 - - [31/05/2019:03:07:23] "GET /forks HTTP/1.1" 400 6922 "http://searchengine.com" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
114.214.178.92 - - [31/05/2019:09:11:50] "POST /shifters HTTP/1.1" 401 9599 "http://bleater.com" "Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201"
123.221.14.56 - - [31/05/2019:11:08:59] "GET /wheelsets HTTP/1.0" 500 10947 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
123.221.14.56 - - [31/05/2019:12:06:40] "GET /shifters HTTP/1.1" 404 9615 "http://searchengine.com" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
81.73.150.239 - - [31/05/2019:18:45:16] "POST /shifters HTTP/1.1" 403 8930 "http://bestcyclingreviews.com/top_online_shops" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
114.214.178.92 - - [01/06/2019:00:30:09] "GET /shifters HTTP/1.0" 401 5170 "http://www.casualcyclist.com" "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25"
114.214.178.92 - - [01/06/2019:02:11:09] "POST /Store/cart.jsp HTTP/1.1" 400 6587 "http://www.casualcyclist.com" "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
__END__
```

## Sample Output 4

```text
114.214.178.92
/forks
http://bestcyclingreviews.com/top_online_shops
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36"
2
```
