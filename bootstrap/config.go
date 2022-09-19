/**
 * Tencent is pleased to support the open source community by making Polaris available.
 *
 * Copyright (C) 2019 THL A29 Limited, a Tencent company. All rights reserved.
 *
 * Licensed under the BSD 3-Clause License (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

package bootstrap

import (
	"errors"
	"fmt"
	"os"

	"github.com/polarismesh/polaris-console/common/log"
	"gopkg.in/yaml.v2"
)

// OAAuthority OA鉴权
type OAAuthority struct {
	EnableOAAuth bool   `yaml:"enableOAAuth"`
	OAToken      string `yaml:"oaToken"`
}

// StaffDepartment 回复请求
type StaffDepartment struct {
	Name       string `json:"ChnName"`
	Department string `json:"DeptNameString"`
}

// PolarisServer polaris server配置
type PolarisServer struct {
	Address      string `yaml:"address"`
	PolarisToken string `yaml:"polarisToken"`
}

type MonitorServer struct {
	Address string `yaml:"address"`
}

// HRData 查询部门名称的地址
type HRData struct {
	EnableHRData  bool   `yaml:"enableHrData"`
	UnitAddress   string `yaml:"unitAddress"`
	DepartmentURL string `yaml:"departmentURL"`
	StaffURL      string `yaml:"staffURL"`
	HRToken       string `yaml:"hrToken"`
}

// ZhiYan 智研系统相关配置
type ZhiYan struct {
	Host        string `yaml:"host"`
	Token       string `yaml:"token"`
	ProjectName string `yaml:"projectName"`
}

// Config 配置
type Config struct {
	Logger        log.Options   `yaml:"logger"`
	WebServer     WebServer     `yaml:"webServer"`
	PolarisServer PolarisServer `yaml:"polarisServer"`
	MonitorServer MonitorServer `yaml:"monitorServer"`
	OAAuthority   OAAuthority   `yaml:"oaAuthority"`
	HRData        HRData        `yaml:"hrData"`
	ZhiYan        ZhiYan        `yaml:"zhiYan"`
}

// WebServer web server配置
type WebServer struct {
	Mode        string `yaml:"mode"`
	ListenIP    string `yaml:"listenIP"`
	ListenPort  int    `yaml:"listenPort"`
	NamingV1URL string `yaml:"namingV1URL"`
	NamingV2URL string `yaml:"namingV2URL"`
	AuthURL     string `yaml:"authURL"`
	MonitorURL  string `yaml:"monitorURL"`
	ConfigURL   string `yaml:"configURL"`
	WebPath     string `yaml:"webPath"`
	JWT         JWT    `yaml:"jwt"`
}

// JWT jwtToken 相关的配置
type JWT struct {
	// 参与jwt运算的key
	SecretKey string `yaml:"secretKey"`
	// 过期时间, 单位为秒
	Expired int `yaml:"expired"`
}

// LoadConfig 加载配置文件
func LoadConfig(filePath string) (*Config, error) {
	if filePath == "" {
		err := errors.New("invalid config file path")
		fmt.Printf("[ERR0R] %v\n", err)
		return nil, err
	}

	fmt.Printf("[INFO] load config from %v\n", filePath)

	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("[ERROR] %v\n", err)
		return nil, err
	}

	config := &Config{}
	config.WebServer.JWT.Expired = 1800 // 默认30分钟
	config.WebServer.JWT.SecretKey = "polarismesh@2021"
	err = yaml.NewDecoder(file).Decode(config)
	if err != nil {
		fmt.Printf("[ERROR] %v\n", err)
	}

	return config, nil
}
