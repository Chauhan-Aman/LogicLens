
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---

std::string s = "egg";
std::string t = "add";


struct __LL_Init {
    __LL_Init() {
        __ll_set_var("s", s);
        __ll_set_var("t", t);

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---
#include <string>
#include <vector>
#include <iostream>
using namespace std;

class Solution {
public:
    bool isIsomorphic(string s, string t) {
        int n = s.length(), m = t.length(); 
        if(m != n) return false;
        vector<int> map1(256, 0), map2(256, 0);

        int i = 0;
        while(i < m){
            if(map1[s[i]] != map2[t[i]]) return false;

            map1[s[i]] = i + 1;
            map2[t[i]] = i + 1;
            i++;
        }

        return true;
    }
};

int main(){
    Solution sol;
    cout << boolalpha << sol.isIsomorphic(s, t) << endl;
    return 0;
}
// -----------------
