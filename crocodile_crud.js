import http from 'k6/http';
import {check, group} from 'k6';
import {Counter} from 'k6/metrics'

export const options = {

    thresholds: {
        'error_counter{action:register}': ['count==0'],
        'error_counter{action2:login}': ['count==0'],
        'group_duration': ['p(95)<6000'],
        'group_duration{group:::REGISTER}': ['p(95)<6000'],
        'group_duration{group:::LOGIN}':['p(95)<6000'],
        'group_duration{group:::LOGIN::TOKEN}':['p(95)<8000'],
        'checks{action:register}': ['rate>=0.99'],
        'checks{action2:login}': ['rate>=0.99'],
        'http_req_duration{action:register}': ['p(95)>1000'],
        'http_req_duration{action2:login}': ['p(95)>1000'],
    }
}

let httpError = new Counter('error_counter')

export default function () {

    let randomNumber = Math.floor(Math.random() * 10000) + 1

    let userData = {
        "username": `JaviTest${randomNumber}`,
        "password": "test1"
    }; 

    let payload = JSON.stringify(userData);

    let params = {
        headers: {
            'Content-Type': 'application/json'
        },
        tags: {
            action:'register',
            action2:'login'
        }
    };
    group('REGISTER', function () {
        let registerURL = 'https://test-api.k6.io/user/register/';
        let res =  http.post(registerURL, payload, params);
        console.log(res)

        if(res.error){
            httpError.add(1, {action: 'register'})
        }

        check(res, {
            'REGISTER - isCreated': r => r.status === 201,
            'REGISTER - isUsername': r => r.json().username === userData.username,
        }, {action: 'register'})
    })
    
    group('LOGIN', function () {
        let urlLogin = 'https://test-api.k6.io/auth/token/login/';
        let res =  http.post(urlLogin, payload, params);
        console.log(res)
        if(res.error){
            httpError.add(1, {action2: 'login'})
        }
        let accessToken = res.json().access; 
        check(res, {
            'LOGIN - isLogin': r => r.status === 200,
        },{action2: 'login'});

        group('TOKEN', function () {
            let urlToken = 'https://test-api.k6.io/my/crocodiles/';

            let authParams = {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            };

            let res = http.get(urlToken, authParams);
            console.log(res)

            check(res, {
                'TOKEN - isToken': r => r.status === 200
            });

        })

        group('CREATE NEW CROCODILE', function () {
            let url = 'https://test-api.k6.io/my/crocodiles/';
            let crocodileData = {
                "name": "Clau",
                "sex": 'M',
                "date_of_birth": "1994-03-01"
            
            }
            let payload =  JSON.stringify(crocodileData);
            let authParams = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                }
            }
          
            let res = http.post(url,payload,authParams)
            let crocodileId = res.json().id
            console.log(crocodileId)
            
            check(res, {
                'NEW CROCODILE - isCrococdileCreated': r => r.status === 201
            })

            res = http.get(`${url}${crocodileId}/`,authParams);

            check(res, {
                'GET CROCODILE - status200': r => r.status === 200,
                'GET CROCODILE - crocodileiD': r=> r.json().id === crocodileId
            })

            res = http.del(`${url}${crocodileId}/`,authParams);


        })
    }) 

}